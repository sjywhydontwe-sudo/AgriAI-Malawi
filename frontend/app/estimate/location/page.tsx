"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { Area, Features } from "@/lib/types";
import { Header, Icon } from "@/components/ui";

const FETCH_ROWS: [string, string][] = [
  ["Rainfall (usual + outlook)", "CHIRPS"],
  ["Elevation & slope", "NASADEM"],
  ["Soil", "Soil database"],
  ["Growing zone", "AEZ"],
];

type Status = { s: "idle" } | { s: "locating" } | { s: "fetching"; step: number } | { s: "error"; msg: string };

export default function LocationStep() {
  const router = useRouter();
  const { t, form, updateForm } = useStore();
  const [areas, setAreas] = useState<Area[]>([]);
  const [status, setStatus] = useState<Status>({ s: "idle" });
  const ticker = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    api.areas().then(setAreas).catch(() => setStatus({ s: "error", msg: "Couldn't reach the server. Check your connection and try again." }));
    return () => clearInterval(ticker.current);
  }, []);

  async function load(lat: number, lng: number, source: "gps" | "area") {
    setStatus({ s: "fetching", step: 0 });
    let step = 0;
    clearInterval(ticker.current);
    ticker.current = setInterval(() => { step = Math.min(step + 1, FETCH_ROWS.length - 1); setStatus({ s: "fetching", step }); }, 350);
    try {
      const [f] = await Promise.all([api.features(lat, lng, source), new Promise((r) => setTimeout(r, 1200))]);
      const feat = f as Features;
      updateForm({
        features: feat,
        ...(form.plant_touched ? {} : { plant_month: feat.onset_month }),
        ...(form.bags_touched ? {} : { target_bags: null }),
      });
      setStatus({ s: "idle" });
    } catch (e) {
      const outside = e instanceof ApiError && e.code === "outside_malawi";
      setStatus({ s: "error", msg: outside ? "Your location seems to be outside Malawi. Choose a district below to try the demo." : "Couldn't reach the server. Check your connection and try again." });
    } finally {
      clearInterval(ticker.current);
    }
  }

  function useGPS() {
    if (!navigator.geolocation) { setStatus({ s: "error", msg: "This phone can't share its location. Please choose your district instead." }); return; }
    setStatus({ s: "locating" });
    navigator.geolocation.getCurrentPosition(
      (p) => load(p.coords.latitude, p.coords.longitude, "gps"),
      (err) => setStatus({ s: "error", msg: err.code === 1
        ? "Location permission was turned off. Allow location in your browser settings, or choose your district below."
        : "We couldn't get your location (weak signal?). Try again outside, or choose your district below." }),
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 60000 },
    );
  }

  const busy = status.s === "fetching" || status.s === "locating";
  const f = form.features;

  return (
    <section className="view active" aria-label="Farm location">
      <div className="scroll">
        <Header title={t("locTitle")} step={1} />
        <p className="sub">{t("locHelp")}</p>
        <div className="stack" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" onClick={useGPS} disabled={busy}><Icon name="gps" />{t("useGps")}</button>
        </div>
        <div className="divider">{t("orChoose")}</div>
        <label className="sr" htmlFor="areaSel">Area</label>
        <select className="select" id="areaSel" disabled={busy}
          value={f?.source === "area" ? f.area_id : ""}
          onChange={(e) => { const a = areas.find((x) => x.id === e.target.value); if (a) load(a.lat, a.lng, "area"); }}>
          <option value="">Choose district…</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <div className="status" aria-live="polite">
          {status.s === "locating" && <div className="notice info"><div className="spin" />Finding your location…</div>}
          {status.s === "error" && <div className="notice err"><Icon name="alert" size={20} /><div>{status.msg}</div></div>}
          {status.s === "fetching" && (
            <div className="card">
              <h3><Icon name="pin" size={18} />Looking up your farm conditions</h3>
              <div className="fetch">
                {FETCH_ROWS.map((r, i) => (
                  <div className="row" key={r[0]}>
                    {i < status.step ? <span className="done"><Icon name="check" size={20} /></span> : i === status.step ? <div className="spin" /> : <div className="wait" />}
                    {r[0]}<small>{r[1]}</small>
                  </div>
                ))}
              </div>
            </div>
          )}
          {status.s === "idle" && f && (
            <div className="card">
              <h3><span className="done"><Icon name="check" size={20} /></span>{f.name}
                <span className="chip gray" style={{ marginLeft: "auto" }}>{f.source === "gps" ? "GPS" : "District centre"}</span></h3>
              <div className="kv">
                <div><small>Usual season rain</small><b>{Math.round(f.rain_avg_mm).toLocaleString()} mm</b></div>
                <div><small>This season&apos;s outlook</small><b>{f.outlook === "above" ? "Above normal" : f.outlook === "below" ? "Below normal" : "Normal"}</b></div>
                <div><small>Soil nutrients</small><b>{f.soil_label}</b></div>
                <div><small>Elevation · slope</small><b>{Math.round(f.elevation_m).toLocaleString()} m · {f.slope_pct}%</b></div>
                <div style={{ gridColumn: "1/-1" }}><small>Growing zone</small><b>{f.aez_label}</b></div>
              </div>
              {f.source === "area" && <p className="help" style={{ margin: "10px 0 0" }}>Using the district centre. GPS gives a more accurate estimate.</p>}
            </div>
          )}
        </div>
      </div>
      <div className="foot">
        <button className="btn btn-primary" disabled={!f || busy} onClick={() => router.push("/estimate/farm")}>
          <span>{t("continue")}</span><Icon name="fwd" />
        </button>
      </div>
    </section>
  );
}
