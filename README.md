# AgriAI Malawi

Early-season maize harvest estimates for smallholder farmers in Malawi.
Mobile-first **Next.js** frontend + **FastAPI** (Python) backend.

```
agriai/
├── frontend/          Next.js 15 (App Router, TypeScript). Pure UI, no model logic.
├── mock-backend/           FastAPI. Features, model, scenarios, advisor.
├── docs/openapi.json  API contract (also live at http://localhost:8000/docs)
└── docker-compose.yml
```

> All numbers are **sample data from a mock model** until the trained IHS5 model and real
> geospatial lookups are plugged in. Nothing in the frontend needs to change when that happens.

## Run locally

**Backend** (Python 3.10+)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
pytest -q                      # API contract tests
```
Interactive API docs: http://localhost:8000/docs

**Frontend** (Node 20+)
```bash
cd frontend
npm install
npm run dev                    # http://localhost:3000
```
The browser only calls same-origin `/api/*`; `next.config.mjs` proxies it to `BACKEND_URL`
(default `http://localhost:8000`). Open it on a phone on the same Wi-Fi via your laptop's IP.

**Or both with Docker:** `docker compose up --build`

## API

| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/health` | Status + model / feature versions |
| GET  | `/api/areas` | Districts for the manual location picker |
| GET  | `/api/features?lat&lng&source` | GPS point → rainfall, terrain, soil, zone. `422 {code:"outside_malawi"}` outside the country |
| POST | `/api/baseline` | Typical yield nearby (used to suggest a goal) |
| POST | `/api/predict` | Estimate, range, goal gap, and all what-if scenarios |
| POST | `/api/advise` | Advisor answer grounded in the estimate; returns `sources: ["model","general"]` |

Schemas live in `backend/app/schemas.py` (source of truth) and are mirrored in
`frontend/lib/types.ts`. If you change one, change the other (or regenerate from `docs/openapi.json`).

### Design rules the API enforces
- **Same features in training and serving.** `backend/app/services/encoding.py::encode_row` is the
  only place inputs become model columns. Import it in the training notebook too.
- **Early-season rainfall = long-term average + outlook**, not the season's actual total
  (unknown at planting). Matches IHS5 `anntot_avg`.
- **No adding up effects.** Every option on the "Why" page and the "best plan" is a full model
  re-run with choices changed (`services/scenarios.py`), so it stays correct for non-linear models.
- **Planting month is month-level** (IHS5 `ag_d35_1a`), fertilizer is an amount (`ag_d39d + ag_d39j`),
  intercropping is a feature.
- **Advisor never invents numbers.** It only quotes numbers from `/api/predict` and labels
  general agronomy advice separately.

## Where each team member plugs in

| Owner | File | Replace |
|---|---|---|
| Data + ML | `backend/app/services/model.py` | Train on IHS5, save a joblib bundle `{median, low, high, version}`, set `MODEL_PATH`. Add monotonic constraints for fertilizer/seed and spatial CV by enumeration area. |
| Geospatial + Backend | `backend/app/services/features.py` | Real lookups: CHIRPS climatology + outlook, NASADEM aggregated to 1 km then slope, AEZ raster, soil class (same source as IHS5 `sq1`), onset month. Read clipped rasters locally with rasterio. |
| GenAI + Agronomy | `backend/app/services/advisor.py` | `LLMAdvisor` with the same signature. Prompt gets the `PredictResponse` as the only source of numbers; answer in `lang`. Calibrate fertilizer/seed effects with trial data. |
| Product + Frontend | `frontend/` | Screens, copy, Chichewa review (`lib/i18n.ts` is a draft). |

## Open data questions (from IHS5 review)
1. Which source and window is IHS5 rainfall (`h2018_tot`, `h2019_tot`, `anntot_avg`)? Match it for CHIRPS.
2. IHS5 covers the 2017/18 **or** 2018/19 rainy season depending on interview date; link each household to the right season.
3. Distribution of `ag_d35_1a` (planting month) for rainy-season maize; months with few samples need lower confidence.
4. Harvest unit conversion (bags, ox-carts, shelled vs on cob) and GPS vs self-reported plot area.
5. Data use terms: no redistribution of microdata; "similar farms nearby" must be aggregated to district level or larger.
