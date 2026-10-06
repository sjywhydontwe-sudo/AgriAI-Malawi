"use client";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { GapChip, Icon, TabBar } from "@/components/ui";

export default function Home() {
  const router = useRouter();
  const { t, form, preds, resetForm } = useStore();
  const latest = preds[0];
  const f = form.features ?? latest?.request.features ?? null;

  return (
    <section className="view active" aria-label="Home">
      <div className="scroll">
        <div className="brand"><div className="logo"><Icon name="leaf" /></div>AgriAI</div>
        <h2 className="greet">{t("greet")}</h2>
        <p className="sub">{t("tagline")}</p>
        <span className="season"><Icon name="seed" size={16} />{t("seasonLabel")}</span>

        <div className="hero-home">
          <svg className="scene" viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true">
            <circle cx="340" cy="40" r="14" fill="#FFD54F" />
            <path d="M0 120 C70 100 130 112 200 102 S330 80 400 92 L400 160 L0 160Z" fill="#558B2F" opacity=".9" />
            <path d="M0 140 C90 128 170 138 250 128 S350 118 400 122 L400 160 L0 160Z" fill="#33691E" />
          </svg>
          <div className="in">
            {f ? (
              <>
                <span className="loc"><Icon name="pin" size={16} />{f.name}</span>
                <div className="facts">
                  <span><Icon name="rain" size={14} /> Rain outlook: {f.outlook === "above" ? "Above normal" : f.outlook === "below" ? "Below normal" : "Normal"}</span>
                  <span><Icon name="terrain" size={14} /> {Math.round(f.elevation_m).toLocaleString()} m</span>
                  <span><Icon name="zone" size={14} /> Soil: {f.soil_label}</span>
                </div>
              </>
            ) : (
              <>
                <span className="loc"><Icon name="pin" size={16} />Location not set</span>
                <p>Start an estimate and we&apos;ll look up rainfall and land conditions for your farm.</p>
              </>
            )}
          </div>
        </div>

        {latest && (
          <button className="card tap" style={{ width: "100%", textAlign: "left", font: "inherit" }} onClick={() => router.push(`/result/${latest.id}`)}>
            <div style={{ flex: 1 }}>
              <small style={{ color: "var(--muted)", fontSize: 13 }}>Last estimate · {latest.request.features.name}</small>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>About {latest.response.bags.expected} bags</div>
              <GapChip gap={latest.response.gap_bags} />
            </div>
            <Icon name="chev" />
          </button>
        )}

        <div className="stack">
          <button className="btn btn-primary btn-big" onClick={() => { resetForm(); router.push("/estimate/location"); }}>
            <Icon name="target" size={24} /><span>{t("ctaEstimate")}</span><span className="s">{t("ctaEstimateSub")}</span>
          </button>
          <button className="btn btn-outline btn-big" onClick={() => router.push(latest ? `/chat?id=${latest.id}` : "/chat")}>
            <Icon name="chat" size={24} /><span>{t("ctaAsk")}</span><span className="s">{t("ctaAskSub")}</span>
          </button>
        </div>
      </div>
      <TabBar active="home" />
    </section>
  );
}
