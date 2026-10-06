"""Build the full /api/predict response.

Every option and plan here is a FULL model re-run with one or more choices changed. We never
add up per-feature effects, so this stays correct for non-linear models with interactions.
"""
from ..data.reference import MONTHS, OUTLOOK, SOIL, recommended_fert_bags, season_idx
from ..schemas import (BestPlan, Bags, Condition, Farm, IntercropInfo, Option, OptionGroup,
                       PredictRequest, PredictResponse, WhatIf)
from .encoding import fert_kg_ha
from .model import YieldModel


def _bags(kg_ha: float, area_ha: float, bag_kg: int) -> int:
    return round(kg_ha * area_ha / bag_kg)


def _money(bags: int, bag_kg: int, price: float) -> int:
    return int(round(bags * bag_kg * price / 1000) * 1000)


def best_choices(req: PredictRequest) -> dict:
    farm = req.farm
    return {
        "seed": "hybrid",
        "fert_bags": max(farm.fert_bags, recommended_fert_bags(farm.area_ha)),
        "plant_month": req.features.onset_month,
    }


def what_if_text(key: str, req: PredictRequest) -> str:
    if key == "fert":
        return f"Use about {recommended_fert_bags(req.farm.area_ha)} bags of fertilizer (planting + top-dressing)"
    if key == "seed":
        return "Plant hybrid seed instead of local seed"
    return f"Finish planting in {MONTHS[req.features.onset_month - 1]}, with the first rains"


def build_prediction(req: PredictRequest, m: YieldModel) -> PredictResponse:
    f, farm, goal = req.features, req.farm, req.goal
    bk, area = goal.bag_kg, farm.area_ha
    B = lambda kg: _bags(kg, area, bk)
    run = lambda **ch: m.predict(f, farm.model_copy(update=ch))

    y = m.predict(f, farm)
    lo, hi = m.interval(f, farm)
    typ = m.typical(f, farm)
    now = B(y)

    # ---- choices ----
    months = sorted(range(1, 13), key=season_idx)
    plant_opts = [Option(value=mo, label=MONTHS[mo - 1], bags=B(k := run(plant_month=mo)), kg_ha=round(k),
                         is_current=mo == farm.plant_month,
                         tag="first rains" if mo == f.onset_month else None) for mo in months]
    seed_opts = [Option(value=s, label=l, bags=B(k := run(seed=s)), kg_ha=round(k), is_current=farm.seed == s)
                 for s, l in (("local", "Local seed"), ("hybrid", "Hybrid seed"))]
    rec = recommended_fert_bags(area)
    levels = sorted({0, max(1, round(rec / 2)), rec, farm.fert_bags})
    fert_opts = [Option(value=b, label="No fertilizer" if b == 0 else f"{b} bag{'s' if b > 1 else ''}",
                        bags=B(k := run(fert_bags=b)), kg_ha=round(k), is_current=b == farm.fert_bags,
                        tag="recommended" if b == rec else None) for b in levels]
    choices = [
        OptionGroup(key="plant_month", label="Planting month", display="chart", options=plant_opts),
        OptionGroup(key="seed", label="Seed type", display="list", options=seed_opts),
        OptionGroup(key="fert", label="Fertilizer", display="list", options=fert_opts),
    ]

    # ---- single what-ifs (sorted by gain) ----
    wi = []
    if fert_kg_ha(farm) < 200:
        wi.append(("fert", run(fert_bags=rec)))
    if farm.seed != "hybrid":
        wi.append(("seed", run(seed="hybrid")))
    if farm.plant_month != f.onset_month:
        wi.append(("plant", run(plant_month=f.onset_month)))
    what_if = sorted([WhatIf(key=k, text=what_if_text(k, req), bags=B(v), gain_bags=max(0, B(v) - now))
                      for k, v in wi], key=lambda w: -w.gain_bags)

    # ---- best plan: all changes in ONE re-run ----
    best = best_choices(req)
    changes = []
    if farm.plant_month != best["plant_month"]:
        changes.append(what_if_text("plant", req))
    if farm.seed != "hybrid":
        changes.append(what_if_text("seed", req))
    if farm.fert_bags < best["fert_bags"]:
        changes.append(what_if_text("fert", req))
    best_bags = B(run(**best))
    best_plan = BestPlan(changes=changes, bags=best_bags, reaches_goal=best_bags >= goal.target_bags) if changes else None

    # ---- conditions the farmer can't change ----
    below = None if f.outlook == "below" else B(m.predict(f.model_copy(update={"outlook": "below"}), farm))
    zone_tone = {"cs": ("Good", "ok"), "ws": ("Average", "gray"), "wsa": ("Difficult", "bad")}.get(f.aez, ("Average", "gray"))
    land = ("Hot lowland", "warn") if f.elevation_m < 300 else ("Steep", "warn") if f.slope_pct > 8 else ("Good", "ok")
    conditions = [
        Condition(key="rain", label="Rainfall", rating=OUTLOOK[f.outlook]["label"], tone=OUTLOOK[f.outlook]["tone"],
                  detail=f"Usually {round(f.rain_avg_mm):,} mm a season. Outlook this season: {OUTLOOK[f.outlook]['label'].lower()}.",
                  note=f"If the season turns out below normal, you may get about {below} bags." if below is not None else None),
        Condition(key="soil", label="Soil nutrients", rating=SOIL[f.soil_class]["label"], tone=SOIL[f.soil_class]["tone"],
                  detail="From the soil map for your area",
                  note="Compost or manure can help poor soil. Ask the advisor." if f.soil_class >= 3 else None),
        Condition(key="land", label="Land", rating=land[0], tone=land[1],
                  detail=f"{round(f.elevation_m):,} m high, {f.slope_pct:g}% slope",
                  note="Hot, low land is harder for maize." if f.elevation_m < 300
                  else "Steep land loses water and soil when it rains." if f.slope_pct > 8 else None),
        Condition(key="zone", label="Growing zone", rating=zone_tone[0], tone=zone_tone[1], detail=f.aez_label),
    ]

    gap = now - goal.target_bags
    return PredictResponse(
        yield_kg_ha=round(y, -1), low_kg_ha=round(lo, -1), high_kg_ha=round(hi, -1), typical_kg_ha=round(typ, -1),
        fert_kg_ha=round(fert_kg_ha(farm)),
        bags=Bags(expected=now, low=B(lo), high=B(hi), goal=goal.target_bags, typical=B(typ)),
        value_mwk=_money(now, bk, goal.price_mwk_per_kg),
        gap_bags=gap,
        missing_value_mwk=_money(-gap, bk, goal.price_mwk_per_kg) if gap < 0 else 0,
        choices=choices,
        intercrop=IntercropInfo(current=farm.intercrop, alternative_bags=B(run(intercrop=not farm.intercrop))),
        best_plan=best_plan,
        what_if=what_if,
        conditions=conditions,
        below_normal_bags=below,
        summary=summary_line(now, goal.target_bags, best_bags, what_if),
        model_version=m.version,
        feature_version=f.feature_version,
    )


def summary_line(now: int, goal: int, best: int, what_if: list[WhatIf]) -> str:
    if now >= goal:
        return (f"You can reach your goal. With the best plan you could get about {best} bags."
                if best > now else "You can reach your goal. Keep up good weeding and field care.")
    if best >= goal:
        top = what_if[0] if what_if else None
        if top and top.bags >= goal:
            return f"{top.text}. This alone could be enough for your goal."
        return f"Following your best plan could get you about {best} bags, enough for your goal."
    if best > now:
        return f"Even the best plan gives about {best} bags, {goal - best} short of your goal. A goal near {best} bags is more realistic."
    return f"Your choices are already the best the model knows. A goal near {now} bags is more realistic this season."
