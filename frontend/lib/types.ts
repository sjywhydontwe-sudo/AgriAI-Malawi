// Mirrors backend/app/schemas.py. Keep the two in sync (or generate from /openapi.json).

export type Region = "north" | "central" | "south";
export type Outlook = "above" | "normal" | "below";
export type Tone = "ok" | "gray" | "warn" | "bad";
export type Source = "model" | "general";

export interface Area { id: string; name: string; lat: number; lng: number }

export interface Features {
  area_id: string;
  name: string;
  lat: number;
  lng: number;
  source: "gps" | "area";
  region: Region;
  rain_avg_mm: number;
  outlook: Outlook;
  elevation_m: number;
  slope_pct: number;
  aez: string;
  aez_label: string;
  soil_class: number;
  soil_label: string;
  onset_month: number;
  feature_version: string;
}

export interface Farm {
  area_ha: number;
  plant_month: number;
  seed: "hybrid" | "local";
  fert_bags: number;
  intercrop: boolean;
}

export interface Goal { target_bags: number; bag_kg: 50 | 90; price_mwk_per_kg: number }

export interface PredictRequest { features: Features; farm: Farm; goal: Goal }

export interface Option {
  value: number | string | boolean;
  label: string;
  bags: number;
  kg_ha: number;
  is_current: boolean;
  tag?: string | null;
}
export interface OptionGroup { key: "plant_month" | "seed" | "fert"; label: string; display: "chart" | "list"; options: Option[] }
export interface WhatIf { key: "fert" | "seed" | "plant"; text: string; bags: number; gain_bags: number }
export interface Condition { key: "rain" | "soil" | "land" | "zone"; label: string; rating: string; tone: Tone; detail: string; note?: string | null }

export interface PredictResponse {
  yield_kg_ha: number;
  low_kg_ha: number;
  high_kg_ha: number;
  typical_kg_ha: number;
  fert_kg_ha: number;
  bags: { expected: number; low: number; high: number; goal: number; typical: number };
  value_mwk: number;
  gap_bags: number;
  missing_value_mwk: number;
  choices: OptionGroup[];
  intercrop: { current: boolean; alternative_bags: number };
  best_plan: { changes: string[]; bags: number; reaches_goal: boolean } | null;
  what_if: WhatIf[];
  conditions: Condition[];
  below_normal_bags: number | null;
  summary: string;
  model_version: string;
  feature_version: string;
}

export interface AdviseResponse { text: string; sources: Source[] }

// ---- client-side only ----
export interface ChatMsg { who: "u" | "a"; text: string; sources?: Source[] }
export interface SavedPrediction {
  id: string;
  key: string;
  ts: number;
  request: PredictRequest;
  response: PredictResponse;
  chat: ChatMsg[];
}
