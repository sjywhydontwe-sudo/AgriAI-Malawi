"use client";
import { useState } from "react";
import type { OptionGroup } from "@/lib/types";
import { Icon } from "./ui";

/** 12 bars in farming-year order (Jul to Jun, as returned by the API), so the curve around the rains stays continuous. */
export default function MonthChart({ group, now }: { group: OptionGroup; now: number }) {
  const cur = group.options.find((o) => o.is_current);
  const onset = group.options.find((o) => o.tag === "first rains");
  const [sel, setSel] = useState(onset && !onset.is_current ? onset.value : cur?.value);
  const mx = Math.max(...group.options.map((o) => o.bags), 1);
  const o = group.options.find((x) => x.value === sel) ?? cur!;
  const d = o.bags - now;

  return (
    <div className="group">
      <div className="gname"><Icon name="cal" size={18} />{group.label}</div>
      <div className="mchart" role="group" aria-label="Bags for each planting month">
        {group.options.map((x) => (
          <button key={String(x.value)} onClick={() => setSel(x.value)} aria-label={`${x.label}: ${x.bags} bags`}
            className={`mb ${x.is_current ? "cur" : ""} ${x.tag === "first rains" ? "onset" : ""} ${x.value === sel ? "sel" : ""}`}>
            <b className="tr"><em>{x.bags}</em><i style={{ height: `${Math.max(3, (x.bags / mx) * 100)}%` }} /></b>
            <span>{x.label.slice(0, 1)}</span>
          </button>
        ))}
      </div>
      <div className="mlegend">
        <span><i style={{ background: "var(--green)" }} />Your month</span>
        <span><i style={{ background: "var(--accent)" }} />First rains</span>
        <span>Tap a bar to compare</span>
      </div>
      <div className="mdetail" aria-live="polite">
        <b>{o.label}</b>{o.tag === "first rains" ? " · first rains" : ""}{o.is_current ? " · your choice" : ""}
        <span className="mv">{o.bags} bags{!o.is_current && d !== 0 && <span className={`delta ${d > 0 ? "up" : "down"}`}>{d > 0 ? "+" : "−"}{Math.abs(d)}</span>}</span>
      </div>
    </div>
  );
}
