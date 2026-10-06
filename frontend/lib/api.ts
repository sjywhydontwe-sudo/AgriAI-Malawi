import type { AdviseResponse, Area, Farm, Features, PredictRequest, PredictResponse } from "./types";

// Same-origin by default: next.config.mjs proxies /api/* to the FastAPI backend.
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export class ApiError extends Error {
  constructor(public status: number, public code: string | undefined, message: string) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit, timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(BASE + path, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    if (!r.ok) {
      let body: { detail?: unknown; code?: string } = {};
      try { body = await r.json(); } catch { /* not json */ }
      const msg = typeof body.detail === "string" ? body.detail : r.statusText;
      throw new ApiError(r.status, body.code, msg);
    }
    return (await r.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, "network", "Couldn't reach the server");
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  areas: () => req<Area[]>("/api/areas"),
  features: (lat: number, lng: number, source: "gps" | "area") =>
    req<Features>(`/api/features?lat=${lat}&lng=${lng}&source=${source}`),
  baseline: (features: Features, farm: Farm) =>
    req<{ typical_kg_ha: number }>("/api/baseline", { method: "POST", body: JSON.stringify({ features, farm }) }),
  predict: (body: PredictRequest) =>
    req<PredictResponse>("/api/predict", { method: "POST", body: JSON.stringify(body) }),
  advise: (context: PredictRequest | null, question: string, lang: "en" | "ny") =>
    req<AdviseResponse>("/api/advise", { method: "POST", body: JSON.stringify({ context, question, lang }) }),
};
