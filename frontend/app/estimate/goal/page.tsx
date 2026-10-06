"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useStore, toFarm } from "@/lib/store";
import type { PredictRequest } from "@/lib/types";
import { fmt } from "@/lib/format";
import { Header, Icon, Overlay, Seg, Stepper } from "@/components/ui";


export default function GoalStep() {
  const router = useRouter();
  const { t, form, updateForm, hydrated, savePrediction, toast } = useStore();
  const [typicalKgHa, setTypicalKgHa] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (hydrated && !form.features) router.replace("/estimate/location"); }, [hydrated, form.features, router]);

  // Typical yield nearby, used to suggest a goal.
  const farmKey = form.features ? JSON.stringify([form.features.area_id, toFarm(form)]) : "";
  useEffect(() => {
    if (!form.features) return;
    api.baseline(form.features, toFarm(form)).then((r) => setTypicalKgHa(r.typical_kg_ha)).catch(() => setTypicalKgHa(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmKey]);

  const typicalBags = typicalKgHa ? Math.max(1, Math.round((typicalKgHa * form.area_ha) / form.bag_kg)) : null;
  useEffect(() => {
    if (form.target_bags == null && typicalBags) updateForm({ target_bags: Math.round(typicalBags * 1.1) });
  }, [form.target_bags, typicalBags, updateForm]);

  if (!form.features) return null;
  const target = form.target_bags ?? 1;

  function setBagKg(v: 50 | 90) {
    const old = form.bag_kg;
    updateForm({ bag_kg: v, target_bags: form.bags_touched ? Math.max(1, Math.round((target * old) / v)) : null });
  }

  async function calculate() {
    const request: PredictRequest = {
      features: form.features!, farm: toFarm(form),
      goal: { target_bags: target, bag_kg: form.bag_kg, price_mwk_per_kg: form.price },
    };
    setBusy(true);
    try {
      const response = await api.predict(request);
      const saved = savePrediction(request, response);
      router.push(`/result/${saved.id}`);
    } catch {
      toast("Couldn't calculate right now. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="view active" aria-label="Your goal">
      <div className="scroll">
        <Header title={t("goalTitle")} step={3} />
        <p className="sub">{t("goalHelp")}</p>

        <div className="label"><Icon name="bag" size={20} /><span>{t("bagSize")}</span></div>
        <p className="help">{t("bagSizeHelp")}</p>
        <Seg options={[[50, "50 kg"], [90, "90 kg"]]} value={form.bag_kg} onChange={(v) => setBagKg(v as 50 | 90)} label={t("bagSize")} />

        <div className="label"><Icon name="target" size={20} /><span>{t("goalBags")}</span></div>
        <Stepper label="target bags" value={target} unit={t("bags")}
          onStep={(d) => updateForm({ target_bags: Math.max(1, target + d), bags_touched: true })}
          onType={(v) => v >= 1 && updateForm({ target_bags: Math.round(v), bags_touched: true })} />
        <p className="help" style={{ marginTop: 8 }}>
          = {fmt((target * form.bag_kg) / form.area_ha)} kg per hectare
          {typicalBags && <><br />A typical farm near you harvests about <b>{typicalBags} bags</b> on this much land.</>}
        </p>

        <div className="label"><Icon name="coin" size={20} /><span>{t("price")}</span></div>
        <div className="num"><div className="box"><small>MWK</small>
          <input type="number" inputMode="numeric" min={1} aria-label={t("price")} style={{ width: 120 }} value={form.price}
            onChange={(e) => { const n = parseInt(e.target.value); if (n > 0) updateForm({ price: n }); }} />
          <small>/ kg</small></div></div>

        <div className="card">
          <h3><Icon name="coin" size={18} />If you reach your goal</h3>
          <div style={{ fontSize: 24, fontWeight: 800 }}>MWK {fmt(target * form.bag_kg * form.price)}</div>
          <p className="help" style={{ margin: "4px 0 0" }}>{target} bags × {form.bag_kg} kg × MWK {fmt(form.price)}</p>
        </div>
      </div>
      <div className="foot">
        <button className="btn btn-primary" onClick={calculate} disabled={busy}><span>{t("calculate")}</span><Icon name="fwd" /></button>
      </div>
      <Overlay on={busy} text={t("calculating")} />
    </section>
  );
}
