"""Yield model interface.

CURRENT: MockYieldModel, a hand-written formula so the app runs without trained weights.

TO DO (data + ML owner): train on IHS5, save with joblib, set MODEL_PATH. SklearnYieldModel
then loads it. Recommended:
  - quantile models (or conformal intervals) for low / high
  - monotonic constraints: fert_kg_ha and hybrid must never lower yield
  - shrink observational fertilizer / seed effects toward on-farm trial results
  - spatial cross-validation grouped by enumeration area
"""
import math
import os
from typing import Protocol

from ..schemas import Farm, Features
from .encoding import FEATURE_COLUMNS, encode_row, fert_kg_ha, plant_offset


class YieldModel(Protocol):
    version: str

    def predict(self, features: Features, farm: Farm) -> float:
        """Expected maize yield in kg/ha of shelled grain."""

    def interval(self, features: Features, farm: Farm) -> tuple[float, float]:
        """(low, high) kg/ha."""

    def typical(self, features: Features, farm: Farm) -> float:
        """Yield of a farm here with average practices."""


AVG_RAIN = 800
CALIBRATION = 0.8  # stands in for shrinking observational effects toward trial evidence
ZONE_BASE = {"ws": 1180, "cs": 1300, "wsa": 900}
SOIL_EFF = {1: 80, 2: 0, 3: -150, 4: -300}
OUTLOOK_EFF = {"above": 60, "normal": 0, "below": -150}


def _plant_eff(off: int) -> float:
    if off == 0:
        return 0
    if off < 0:
        return max(-900, 150 * off)
    return [0, -250, -550, -800][min(off, 3)] - (100 * (off - 3) if off > 3 else 0)


class MockYieldModel:
    version = "mock-1"

    def _env(self, f: Features) -> float:
        rain = max(-450, min(250, (f.rain_avg_mm - AVG_RAIN) * 0.8)) + OUTLOOK_EFF[f.outlook]
        terrain = -max(0, f.slope_pct - 8) * 12 + (-150 if f.elevation_m < 300 else 0)
        return ZONE_BASE.get(f.aez, 1150) + rain + SOIL_EFF[f.soil_class] + terrain

    def predict(self, features: Features, farm: Farm) -> float:
        seed = 430 * CALIBRATION if farm.seed == "hybrid" else 0
        fert = 950 * CALIBRATION * (1 - math.exp(-fert_kg_ha(farm) / 150))  # diminishing returns
        total = self._env(features) + _plant_eff(plant_offset(features, farm)) + seed + fert
        return max(200.0, total) * (0.85 if farm.intercrop else 1.0)       # not additive on purpose

    def interval(self, features: Features, farm: Farm) -> tuple[float, float]:
        y = self.predict(features, farm)
        spread = 0.18 if features.outlook == "normal" else 0.22
        return y * (1 - spread), y * (1 + spread)

    def typical(self, features: Features, farm: Farm) -> float:
        return self._env(features) - 60 + 430 * CALIBRATION * 0.4 + 300


class SklearnYieldModel:
    """Loads a joblib bundle: {"median": est, "low": est, "high": est, "typical": est?, "version": str}."""

    def __init__(self, path: str):
        import joblib
        import pandas as pd

        self._pd = pd
        bundle = joblib.load(path)
        self.median, self.low, self.high = bundle["median"], bundle["low"], bundle["high"]
        self.version = bundle.get("version", os.path.basename(path))
        self._fallback = MockYieldModel()

    def _row(self, features, farm):
        return self._pd.DataFrame([encode_row(features, farm)], columns=FEATURE_COLUMNS)

    def predict(self, features, farm):
        return float(self.median.predict(self._row(features, farm))[0])

    def interval(self, features, farm):
        r = self._row(features, farm)
        return float(self.low.predict(r)[0]), float(self.high.predict(r)[0])

    def typical(self, features, farm):
        # Average practices: on-time planting, usual seed / fertilizer share. Replace with data means.
        avg = farm.model_copy(update={"plant_month": features.onset_month, "seed": "local",
                                      "fert_bags": round(100 * farm.area_ha / 50), "intercrop": False})
        return self.predict(features, avg)


def load_model() -> YieldModel:
    path = os.getenv("MODEL_PATH")
    if path and os.path.exists(path):
        return SklearnYieldModel(path)
    return MockYieldModel()


model: YieldModel = load_model()
