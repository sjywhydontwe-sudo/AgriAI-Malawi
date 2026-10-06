"""POST /api/advise: answers grounded in the farmer's own estimate.

CURRENT: RuleBasedAdvisor (keyword intents) so the app works offline and is predictable.

TO DO (GenAI + agronomy owner): implement LLMAdvisor with the same signature.
  - Put the PredictResponse (numbers the farmer already saw) into the prompt as the ONLY
    source of model numbers; never let the LLM invent yields.
  - Mark each answer's sources: "model" (numbers from the estimate) and/or
    "general" (agronomy guidance not produced by the model).
  - Answer in the requested language (lang="ny" for Chichewa).
"""
import os
import re
from typing import Protocol

from ..data.reference import MONTHS, recommended_fert_bags
from ..schemas import AdviseRequest, AdviseResponse
from .model import YieldModel
from .scenarios import build_prediction

CAVEAT = "These numbers come from farms like yours. Your real result can differ."


class Advisor(Protocol):
    def answer(self, req: AdviseRequest, m: YieldModel) -> AdviseResponse: ...


class RuleBasedAdvisor:
    def answer(self, req: AdviseRequest, m: YieldModel) -> AdviseResponse:
        s = req.question.lower()
        ctx = req.context
        if ctx is None:
            if re.search(r"plant|when|date", s):
                return AdviseResponse(text="Most farmers in Malawi plant with the first good rains, usually mid November to early December, once the soil is wet to about a hand's depth.", sources=["general"])
            if re.search(r"store|storage|weevil", s):
                return AdviseResponse(text="Dry maize well (until the grain cracks when bitten), use hermetic (PICS) bags if you can, and keep bags off the floor.", sources=["general"])
            return AdviseResponse(text="For advice about your own field, please make an estimate first. Then I can explain your numbers.", sources=[])

        p = build_prediction(ctx, m)
        f, farm, goal = ctx.features, ctx.farm, ctx.goal
        now = p.bags.expected
        bags = lambda kg: round(kg * farm.area_ha / goal.bag_kg)
        run = lambda **ch: bags(m.predict(f, farm.model_copy(update=ch)))
        place = f.name.replace("Near ", "")

        if re.search(r"goal|improve|reach|increase|better|more|gap", s):
            if not p.what_if:
                rest = (f"The rest of the gap comes from rainfall, soil and land. A goal of about **{now} bags** is more realistic this season."
                        if now < goal.target_bags else "You're on track.")
                return AdviseResponse(text=f"Your planting month, seed and fertilizer are already the best options the model knows about. {rest}", sources=["model"])
            lines = "\n".join(f"- {w.text}: **{w.bags} bags** (+{w.gain_bags})" for w in p.what_if)
            return AdviseResponse(text=f"Each change on its own would give you:\n{lines}\n{p.summary}\n{CAVEAT}", sources=["model"])

        if re.search(r"rain|dry|drought|poor", s):
            first = (f"The outlook for this season is already below normal, and your estimate of {now} bags includes that."
                     if p.below_normal_bags is None else
                     f"If the season turns out below normal, you may get about **{p.below_normal_bags} bags** instead of {now}.")
            return AdviseResponse(text=f"{first}\nTo protect against dry spells, farmers often use mulching, tied ridges or pit planting to keep water in the soil.", sources=["model", "general"])

        if re.search(r"cheap|cost|afford|alternative|fertili", s):
            rec = recommended_fert_bags(farm.area_ha)
            half = max(1, round(rec / 2))
            if farm.fert_bags >= rec:
                part = f"You already use about the recommended amount ({rec} bags). With {half} bags you may get about **{run(fert_bags=half)} bags** of maize instead of {now}."
            else:
                part = f"With {rec} bags of fertilizer you may get about **{run(fert_bags=rec)} bags** of maize instead of {now}. Even {half} bags would give about {run(fert_bags=half)}."
            return AdviseResponse(text=f"{part}\nLower cost options include compost, animal manure, and mixing in pigeon pea or groundnuts. The model can't estimate their effect yet.", sources=["model", "general"])

        if re.search(r"plant|when|date|month|early|late", s):
            on = f.onset_month
            tail = (", which is well timed." if farm.plant_month == on else
                    f". Finishing in {MONTHS[on - 1]} would give about **{run(plant_month=on)} bags** instead of {now}.")
            return AdviseResponse(text=f"First rains near {place} usually come in **{MONTHS[on - 1]}**. You finish planting in {MONTHS[farm.plant_month - 1]}{tail}", sources=["model"])

        return AdviseResponse(text="I can explain your estimate, how to reach your goal, what happens if rains are poor, fertilizer amounts, and planting time. Try one of the suggestions below.", sources=[])


def load_advisor() -> Advisor:
    # if os.getenv("LLM_API_KEY"): return LLMAdvisor(...)
    return RuleBasedAdvisor()


advisor: Advisor = load_advisor()
