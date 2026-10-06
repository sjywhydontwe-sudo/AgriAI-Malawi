"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { ACRE, clamp } from "@/lib/format";
import { Header, Icon, Seg, Stepper } from "@/components/ui";

const MONTH_OPTS: [number, string][] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => [i + 1, m]);

export default function FarmStep() {
  const router = useRouter();
  const { t, form, updateForm, unit, setUnit, hydrated } = useStore();

  useEffect(() => { if (hydrated && !form.features) router.replace("/estimate/location"); }, [hydrated, form.features, router]);
  if (!form.features) return null;

  const toUnit = (ha: number) => (unit === "ha" ? ha : ha / ACRE);
  const fromUnit = (v: number) => (unit === "ha" ? v : v * ACRE);
  const setArea = (ha: number) => updateForm({ area_ha: clamp(ha, 0.05, 50), ...(form.bags_touched ? {} : { target_bags: null }) });

  return (
    <section className="view active" aria-label="Farm details">
      <div className="scroll">
        <Header title={t("farmTitle")} step={2} />
        <span className="chip ok"><Icon name="seed" size={14} />{t("cropMaize")}</span>

        <div className="label"><Icon name="ruler" size={20} /><span>{t("fieldSize")}</span></div>
        <Stepper label="field size" decimals={2} step={0.05} value={toUnit(form.area_ha)} unit={unit === "ha" ? "ha" : "acres"}
          onStep={(d) => setArea(fromUnit(+(toUnit(form.area_ha) + d * (unit === "ha" ? 0.1 : 0.25)).toFixed(2)))}
          onType={(v) => v > 0 && setArea(fromUnit(v))} />
        <div style={{ marginTop: 10 }}><Seg options={[["ha", "Hectares"], ["acre", "Acres"]]} value={unit} onChange={setUnit} label="Unit" /></div>

        <div className="label"><Icon name="cal" size={20} /><span>{t("plantDate")}</span></div>
        <Seg id="monthSeg" options={MONTH_OPTS} value={form.plant_month} label={t("plantDate")}
          onChange={(m) => updateForm({ plant_month: m, plant_touched: true })} />

        <div className="label"><Icon name="seed" size={20} /><span>{t("seedType")}</span></div>
        <Seg options={[["hybrid", t("hybrid")], ["local", t("local")]]} value={form.seed} onChange={(s) => updateForm({ seed: s })} label={t("seedType")} />

        <div className="label"><Icon name="fert" size={20} /><span>{t("fertilizer")}</span></div>
        <p className="help">{t("fertHelp")}</p>
        <Stepper label="fertilizer bags" value={form.fert_bags} unit={t("bags")}
          onStep={(d) => updateForm({ fert_bags: clamp(form.fert_bags + d, 0, 99) })}
          onType={(v) => updateForm({ fert_bags: clamp(Math.round(v), 0, 99) })} />

        <div className="label"><Icon name="zone" size={20} /><span>{t("intercrop")}</span></div>
        <p className="help">{t("intercropHelp")}</p>
        <Seg options={[[false, t("maizeOnly")], [true, t("mixed")]]} value={form.intercrop} onChange={(v) => updateForm({ intercrop: v })} label={t("intercrop")} />
      </div>
      <div className="foot">
        <button className="btn btn-primary" disabled={!form.plant_month} onClick={() => router.push("/estimate/goal")}>
          <span>{t("continue")}</span><Icon name="fwd" />
        </button>
      </div>
    </section>
  );
}
