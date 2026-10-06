"use client";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { fmtArea } from "@/lib/format";
import { GapChip, Icon, TabBar } from "@/components/ui";

export default function HistoryPage() {
  const router = useRouter();
  const { t, preds, unit, hydrated } = useStore();
  return (
    <section className="view active" aria-label="History">
      <div className="scroll">
        <div className="hdr" style={{ marginLeft: 0 }}><h1>{t("history")}</h1></div>
        {hydrated && (preds.length ? preds.map((p) => (
          <button key={p.id} className="hist" onClick={() => router.push(`/result/${p.id}`)}>
            <div className="ic"><Icon name="seed" /></div>
            <div><b>{p.request.features.name} · {fmtArea(p.request.farm.area_ha, unit)}</b>
              <small>{new Date(p.ts).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {p.request.farm.seed === "hybrid" ? "Hybrid" : "Local"} · {p.request.farm.fert_bags} bags fertilizer</small></div>
            <div className="y">{p.response.bags.expected} bags<br /><GapChip gap={p.response.gap_bags} /></div>
          </button>
        )) : <div className="empty"><Icon name="history" size={48} /><div>No estimates yet.<br />Your past estimates will appear here.</div></div>)}
      </div>
      <TabBar active="history" />
    </section>
  );
}
