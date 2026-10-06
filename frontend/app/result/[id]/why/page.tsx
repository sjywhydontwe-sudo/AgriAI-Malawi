"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { OptionGroup } from "@/lib/types";
import { Header, HomeButton, Icon } from "@/components/ui";
import MonthChart from "@/components/MonthChart";
import NotFound from "@/components/NotFound";

const COND_ICON = { rain: "rain", soil: "zone", land: "terrain", zone: "zone" } as const;
const GROUP_ICON = { plant_month: "cal", seed: "seed", fert: "fert" } as const;

function OptionList({ group, now, max }: { group: OptionGroup; now: number; max: number }) {
  return (
    <div className="group">
      <div className="gname"><Icon name={GROUP_ICON[group.key]} size={18} />{group.label}</div>
      {group.options.map((o) => {
        const d = o.bags - now;
        return (
          <div key={String(o.value)} className={`opt ${o.is_current ? "cur" : ""}`}>
            <div className="top">
              <span>{o.label}{o.tag ? ` · ${o.tag}` : ""}</span>
              {o.is_current && <span className="chip ok">Your choice</span>}
              <b>{o.bags} bags</b>
              {!o.is_current && d !== 0 && <span className={`delta ${d > 0 ? "up" : "down"}`}>{d > 0 ? "+" : "−"}{Math.abs(d)}</span>}
            </div>
            <div className="bar"><i style={{ width: `${(o.bags / max) * 100}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

export default function WhyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t, getPrediction, hydrated } = useStore();
  const p = getPrediction(id);
  if (!hydrated) return null;
  if (!p) return <NotFound />;

  const r = p.response, now = r.bags.expected;
  const lists = r.choices.filter((g) => g.display === "list");
  const max = Math.max(r.best_plan?.bags ?? 0, ...lists.flatMap((g) => g.options.map((o) => o.bags)), 1);

  return (
    <section className="view active" aria-label="Why this result">
      <div className="scroll">
        <Header title={t("whyTitle")} right={<HomeButton />} />
        <p className="base">You expect <b>{now} bags</b>. Here is how many bags each choice would give, with everything else kept the same.</p>

        <div className="sect"><Icon name="edit" size={16} />YOUR CHOICES</div>
        <div className="caveat"><Icon name="info" size={16} /><span>Estimated from farms like yours that made each choice. Your real result can differ.</span></div>
        {r.choices.map((g) => g.display === "chart"
          ? <MonthChart key={g.key} group={g} now={now} />
          : <OptionList key={g.key} group={g} now={now} max={max} />)}

        <div className="group">
          <div className="gname"><Icon name="zone" size={18} />Mixed cropping</div>
          <div className="cond" style={{ border: 0, paddingTop: 6 }}><div style={{ flex: 1 }}><small>
            {r.intercrop.current
              ? <>Your field is mixed. Maize only would give about <b>{r.intercrop.alternative_bags} bags</b> of maize, but you would lose the beans, peas or groundnuts. This is your choice, so it is not in the plan below.</>
              : <>Your field is maize only. Mixing in a legume would give about <b>{r.intercrop.alternative_bags} bags</b> of maize, plus beans, peas or groundnuts, and can help the soil.</>}
          </small></div></div>
        </div>

        <div className="sect"><Icon name="bulb" size={16} />YOUR BEST PLAN</div>
        {r.best_plan ? (
          <div className="best">
            <div className="top"><b>All changes together</b><span className="big2">{r.best_plan.bags} bags</span></div>
            <ul>{r.best_plan.changes.map((c) => <li key={c}>{c}</li>)}</ul>
            <p>{r.best_plan.reaches_goal ? `This reaches your goal of ${r.bags.goal} bags.` : `This is still ${r.bags.goal - r.best_plan.bags} bags below your goal of ${r.bags.goal}.`} Changes can work together, so this can be more or less than adding them up one by one.</p>
          </div>
        ) : <p className="help" style={{ marginTop: 8 }}>You are already using the best choices the model knows about.</p>}

        <div className="sect"><Icon name="rain" size={16} />CONDITIONS YOU CAN&apos;T CHANGE</div>
        {r.conditions.map((c) => (
          <div className="cond" key={c.key}>
            <span className="ic-soft"><Icon name={COND_ICON[c.key]} size={20} /></span>
            <div style={{ flex: 1 }}>
              <div className="top"><b>{c.label}</b><span className={`chip ${c.tone}`}>{c.rating}</span></div>
              <small>{c.detail}</small>
              {c.note && <p>{c.note}</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="summary">
        <small>{t("nextStep")}</small>
        <p>{r.summary}</p>
        <button className="btn" onClick={() => router.push(`/chat?id=${p.id}`)}><Icon name="chat" size={20} /><span>{t("askAdvisor")}</span></button>
      </div>
    </section>
  );
}
