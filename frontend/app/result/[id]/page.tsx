"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { fmt, fmtArea, money } from "@/lib/format";
import { Header, HomeButton, Icon } from "@/components/ui";
import NotFound from "@/components/NotFound";

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t, getPrediction, hydrated, unit, updateForm } = useStore();
  const p = getPrediction(id);
  if (!hydrated) return null;
  if (!p) return <NotFound />;

  const r = p.response, req = p.request, b = r.bags;
  const ok = r.gap_bags >= 0;
  const per = Math.max(b.expected, b.goal) > 40 ? 5 : 1;
  const nEst = Math.round(b.expected / per), n = Math.max(nEst, Math.round(b.goal / per));
  const pos = b.high > b.low ? ((b.expected - b.low) / (b.high - b.low)) * 100 : 50;

  function edit() {
    updateForm({
      features: req.features, area_ha: req.farm.area_ha, plant_month: req.farm.plant_month, plant_touched: true,
      seed: req.farm.seed, fert_bags: req.farm.fert_bags, intercrop: req.farm.intercrop,
      target_bags: req.goal.target_bags, bags_touched: true, bag_kg: req.goal.bag_kg, price: req.goal.price_mwk_per_kg,
    });
    router.push("/estimate/farm");
  }

  return (
    <section className="view active" aria-label="Prediction result">
      <div className="scroll">
        <Header title={t("resultTitle")} right={<HomeButton />} />

        <div className={`status ${ok ? "ok" : "bad"}`}>
          <Icon name={ok ? "check" : "alert"} /><span>{ok ? "You can reach your goal" : `${-r.gap_bags} bags short of your goal`}</span>
        </div>

        <div className="res-hero">
          <div className="k">EXPECTED HARVEST</div>
          <div className="big">{b.expected}<span> bags</span></div>
          <div className="range" aria-label={`Possible range ${b.low} to ${b.high} bags`}>
            <div className="rt"><i style={{ left: `${pos}%` }} /></div>
            <div className="rl"><span><b>{b.low}</b> poor season</span><span><b>{b.high}</b> good season</span></div>
          </div>
        </div>

        <div className="tiles">
          <div className="tile"><Icon name="coin" /><b>{money(r.value_mwk)}</b><small>Value at your price</small></div>
          <div className="tile"><Icon name="bag" /><b>{req.goal.bag_kg} kg bags</b>
            <small>Shelled grain · {fmtArea(req.farm.area_ha, unit)}{req.farm.intercrop ? " · mixed" : ""}</small></div>
        </div>

        <div className="card">
          <h3><Icon name="target" size={18} />Your goal: {b.goal} bags</h3>
          <div className="baggrid" role="img" aria-label={`${b.expected} bags expected out of a goal of ${b.goal}`}>
            {Array.from({ length: n }, (_, i) => (
              <svg key={i} className={`bag ${i < nEst ? "f" : "miss"}`} width="24" height="24" aria-hidden="true"><use href="#i-bag" /></svg>
            ))}
          </div>
          <div className="legend">
            <span><svg className="bag f" width="16" height="16"><use href="#i-bag" /></svg>Expected harvest</span>
            {!ok && <span><svg className="bag miss" width="16" height="16"><use href="#i-bag" /></svg>Missing to reach goal</span>}
            {per > 1 && <span>1 icon = {per} bags</span>}
          </div>
          <div className={`gapbox ${ok ? "ok" : "bad"}`}>
            {ok ? <>Great, that is <b>{r.gap_bags} bag{r.gap_bags === 1 ? "" : "s"} more</b> than your goal.</>
              : <>You may get <b>{b.expected}</b> bags, but your goal is <b>{b.goal}</b>. The missing <b>{-r.gap_bags} bags</b> are worth about <b>{money(r.missing_value_mwk)}</b>.</>}
          </div>
        </div>

        <div className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="ic-soft"><Icon name="pin" size={20} /></span>
          <div><b>Similar farms near you: about {b.typical} bags</b>
            <p className="help" style={{ margin: "2px 0 0" }}>Farms of the same size in {req.features.name.replace("Near ", "")} using the usual seed and fertilizer.</p></div>
        </div>

        <div className="early"><Icon name="info" size={18} /><span>This is an early guess based on usual rainfall and this season&apos;s outlook. It can change during the season.</span></div>

        <div className="stack">
          <button className="btn btn-orange" onClick={() => router.push(`/result/${p.id}/why`)}>{ok ? "Why this result?" : "How can I get more bags?"} <Icon name="fwd" /></button>
          <button className="btn btn-outline" onClick={edit}><Icon name="edit" size={20} />Change my answers</button>
        </div>

        <details className="details"><summary>Details for extension officers</summary>
          <div className="kv" style={{ marginTop: 10 }}>
            <div><small>Estimated yield</small><b>{fmt(r.yield_kg_ha)} kg/ha</b></div>
            <div><small>Likely range</small><b>{fmt(r.low_kg_ha)} to {fmt(r.high_kg_ha)}</b></div>
            <div><small>Goal</small><b>{fmt((b.goal * req.goal.bag_kg) / req.farm.area_ha)} kg/ha</b></div>
            <div><small>Typical nearby</small><b>{fmt(r.typical_kg_ha)} kg/ha</b></div>
            <div><small>Fertilizer</small><b>{fmt(r.fert_kg_ha)} kg/ha</b></div>
            <div><small>Versions</small><b style={{ fontSize: 13 }}>{r.feature_version} · {r.model_version}</b></div>
          </div>
        </details>
      </div>
    </section>
  );
}
