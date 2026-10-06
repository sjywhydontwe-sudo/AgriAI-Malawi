"use client";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg className="i" width={size} height={size} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}

export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  const { t } = useStore();
  return (
    <button className="icb" aria-label={t("back")}
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}>
      <Icon name="back" size={24} />
    </button>
  );
}

export function HomeButton() {
  const router = useRouter();
  const { t } = useStore();
  return (
    <button className="icb" aria-label={t("home")} onClick={() => router.push("/")}>
      <Icon name="home" size={22} />
    </button>
  );
}

export function Header({ title, step, right }: { title: string; step?: number; right?: React.ReactNode }) {
  return (
    <>
      <div className="hdr">
        <BackButton />
        <h1>{title}</h1>
        {step ? <span className="stepper-txt">{step} / 3</span> : right}
      </div>
      {step ? <div className="progress"><i style={{ width: `${(step / 3) * 100}%` }} /></div> : null}
    </>
  );
}

export function Seg<T extends string | number | boolean>({ options, value, onChange, label, id, className }: {
  options: [T, string][];
  value: T | null;
  onChange: (v: T) => void;
  label?: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={`seg ${className ?? ""}`} role="radiogroup" aria-label={label} id={id}>
      {options.map(([v, l]) => (
        <button key={String(v)} role="radio" aria-checked={v === value} className={v === value ? "on" : ""} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onStep, onType, unit, label, step = 1, decimals = 0, width }: {
  value: number;
  onStep: (dir: 1 | -1) => void;
  onType: (v: number) => void;
  unit: React.ReactNode;
  label: string;
  step?: number;
  decimals?: number;
  width?: number;
}) {
  return (
    <div className="num">
      <button className="icb" onClick={() => onStep(-1)} aria-label={`Decrease ${label}`}><Icon name="minus" /></button>
      <div className="box">
        <input type="number" inputMode={decimals ? "decimal" : "numeric"} step={step} aria-label={label}
          style={width ? { width } : undefined}
          value={decimals ? +value.toFixed(decimals) : value}
          onChange={(e) => { const n = parseFloat(e.target.value); if (!Number.isNaN(n)) onType(n); }} />
        <small>{unit}</small>
      </div>
      <button className="icb" onClick={() => onStep(1)} aria-label={`Increase ${label}`}><Icon name="plus" /></button>
    </div>
  );
}

export function TabBar({ active }: { active: "home" | "history" | "settings" }) {
  const router = useRouter();
  const { t } = useStore();
  const tabs: ["home" | "history" | "settings", string, string][] = [["home", "/", "home"], ["history", "/history", "history"], ["settings", "/settings", "settings"]];
  return (
    <nav className="tabbar">
      {tabs.map(([k, href, icon]) => (
        <button key={k} className={k === active ? "on" : ""} aria-current={k === active ? "page" : undefined}
          onClick={() => k !== active && (k === "home" ? router.push(href) : router.replace(href))}>
          <Icon name={icon} size={24} />{t(k)}
        </button>
      ))}
    </nav>
  );
}

export function Toast() {
  const { toastMsg } = useStore();
  return <div className={`toast ${toastMsg ? "on" : ""}`} role="status">{toastMsg}</div>;
}

export function Overlay({ on, text }: { on: boolean; text: string }) {
  return <div className={`overlay ${on ? "on" : ""}`} role="status"><div className="spin" /><span>{text}</span></div>;
}

export function GapChip({ gap }: { gap: number }) {
  return gap >= 0 ? <span className="chip ok">Meets goal</span> : <span className="chip warn">{-gap} bags short</span>;
}
