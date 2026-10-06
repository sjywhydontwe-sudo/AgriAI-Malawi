"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMsg, Farm, Features, PredictRequest, PredictResponse, SavedPrediction } from "./types";
import { translate, type Lang } from "./i18n";

export interface FormState {
  features: Features | null;
  area_ha: number;
  plant_month: number | null;
  plant_touched: boolean;
  seed: "hybrid" | "local";
  fert_bags: number;
  intercrop: boolean;
  target_bags: number | null;
  bags_touched: boolean;
  bag_kg: 50 | 90;
  price: number;
}

const INITIAL_FORM: FormState = {
  features: null, area_ha: 1, plant_month: null, plant_touched: false, seed: "local", fert_bags: 0,
  intercrop: false, target_bags: null, bags_touched: false, bag_kg: 50, price: 500,
};

interface Store {
  hydrated: boolean;
  lang: Lang;
  unit: "ha" | "acre";
  form: FormState;
  preds: SavedPrediction[];
  generalChat: ChatMsg[];
  t: (k: string) => string;
  setLang: (l: Lang) => void;
  setUnit: (u: "ha" | "acre") => void;
  updateForm: (p: Partial<FormState>) => void;
  resetForm: () => void;
  savePrediction: (req: PredictRequest, res: PredictResponse) => SavedPrediction;
  getPrediction: (id: string | null | undefined) => SavedPrediction | undefined;
  appendChat: (predId: string | null, msg: ChatMsg) => void;
  clearHistory: () => void;
  toast: (msg: string) => void;
  toastMsg: string | null;
}

const Ctx = createContext<Store | null>(null);
const STORE_KEY = "agriai_next_v1";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [unit, setUnit] = useState<"ha" | "acre">("ha");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [preds, setPreds] = useState<SavedPrediction[]>([]);
  const [generalChat, setGeneralChat] = useState<ChatMsg[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Browser storage is a convenience only; the app works if it's unavailable.
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      if (d.lang) setLang(d.lang);
      if (d.unit) setUnit(d.unit);
      if (Array.isArray(d.preds)) setPreds(d.preds);
      if (Array.isArray(d.generalChat)) setGeneralChat(d.generalChat);
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ lang, unit, preds, generalChat })); } catch { /* ignore */ }
  }, [hydrated, lang, unit, preds, generalChat]);
  useEffect(() => { document.documentElement.lang = lang === "ny" ? "ny" : "en"; }, [lang]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const predsRef = useRef(preds);
  useEffect(() => { predsRef.current = preds; }, [preds]);

  const savePrediction = useCallback((request: PredictRequest, response: PredictResponse) => {
    const key = JSON.stringify(request);
    const existing = predsRef.current.find((p) => p.key === key);
    // Same inputs: reuse the entry (keeps its chat) instead of adding a duplicate.
    const saved: SavedPrediction = existing
      ? { ...existing, ts: Date.now(), response }
      : { id: "p" + Date.now(), key, ts: Date.now(), request, response, chat: [] };
    const next = [saved, ...predsRef.current.filter((p) => p.key !== key)].slice(0, 30);
    predsRef.current = next;
    setPreds(next);
    return saved;
  }, []);

  const appendChat = useCallback((predId: string | null, msg: ChatMsg) => {
    if (!predId) { setGeneralChat((c) => [...c, msg]); return; }
    setPreds((list) => list.map((p) => (p.id === predId ? { ...p, chat: [...p.chat, msg] } : p)));
  }, []);

  const value = useMemo<Store>(() => ({
    hydrated, lang, unit, form, preds, generalChat, toastMsg,
    t: (k) => translate(lang, k),
    setLang, setUnit,
    updateForm: (p) => setForm((f) => ({ ...f, ...p })),
    resetForm: () => setForm(INITIAL_FORM),
    savePrediction,
    getPrediction: (id) => preds.find((p) => p.id === id),
    appendChat,
    clearHistory: () => { setPreds([]); setGeneralChat([]); },
    toast,
  }), [hydrated, lang, unit, form, preds, generalChat, toastMsg, savePrediction, appendChat, toast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

export function toFarm(f: FormState): Farm {
  return { area_ha: +f.area_ha.toFixed(3), plant_month: f.plant_month ?? f.features!.onset_month, seed: f.seed, fert_bags: f.fert_bags, intercrop: f.intercrop };
}
