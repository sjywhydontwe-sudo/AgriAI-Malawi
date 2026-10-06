import os

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .schemas import (AdviseRequest, AdviseResponse, ApiError, Area, BaselineRequest, BaselineResponse,
                      Features, PredictRequest, PredictResponse)
from .services import advisor as advisor_mod
from .services import features as features_mod
from .services import model as model_mod
from .services.scenarios import build_prediction

app = FastAPI(
    title="AgriAI Malawi API",
    version="0.1.0",
    description="Early-season maize yield estimates for Malawi smallholders. "
                "Feature definitions follow the World Bank IHS5 training data.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "model_version": model_mod.model.version, "feature_version": features_mod.FEATURE_VERSION}


@app.get("/api/areas", response_model=list[Area])
def areas():
    """Districts for the manual location picker."""
    return features_mod.list_areas()


@app.get("/api/features", response_model=Features, responses={422: {"model": ApiError}})
def get_features(lat: float = Query(..., ge=-90, le=90), lng: float = Query(..., ge=-180, le=180),
                 source: str = Query("gps", pattern="^(gps|area)$")):
    """Environmental features for a GPS point (rainfall, terrain, soil, zone)."""
    try:
        return features_mod.provider.get(lat, lng, source)
    except features_mod.OutsideMalawiError as e:
        return JSONResponse(status_code=422, content={"detail": str(e), "code": "outside_malawi"})


@app.post("/api/baseline", response_model=BaselineResponse)
def baseline(req: BaselineRequest):
    """Typical yield for a farm here with average practices (used to suggest a goal)."""
    return BaselineResponse(typical_kg_ha=round(model_mod.model.typical(req.features, req.farm), -1))


@app.post("/api/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """Yield estimate, range, goal gap, and what-if scenarios (all computed by the model)."""
    return build_prediction(req, model_mod.model)


@app.post("/api/advise", response_model=AdviseResponse)
def advise(req: AdviseRequest):
    """Advisor answer grounded in the estimate passed as context."""
    return advisor_mod.advisor.answer(req, model_mod.model)
