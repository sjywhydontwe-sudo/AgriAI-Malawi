"""GET /api/features: turn a GPS point into model-ready environmental features.

CURRENT: SampleFeatureProvider returns the nearest sample district.

TO DO (geospatial + backend owner), keep the same return type:
  - rain_avg_mm : long-term mean of CHIRPS July-June totals at the point
                  (match IHS5 anntot_avg; confirm the IHS5 rainfall source first)
  - outlook     : seasonal outlook category for the coming season
  - elevation_m / slope_pct : NASADEM aggregated to 1 km FIRST, then slope, to match srtm_1k
  - aez         : HarvestChoice AEZ 2009 raster class
  - soil_class  : same soil database as IHS5 sq1 (confirm it is FAO HWSD)
  - onset_month : usual first-rains month from CHIRPS climatology
Static rasters (DEM, AEZ, soil) should be clipped to Malawi and read locally with rasterio,
so no external call is needed per request. Only rainfall needs a scheduled refresh.
"""
import math
from typing import Protocol

from ..data.reference import AREAS, MALAWI_BBOX, ONSET_MONTH, SOIL, ZONES
from ..schemas import Area, Features

FEATURE_VERSION = "ihs5-v1-sample"


class OutsideMalawiError(ValueError):
    pass


class FeatureProvider(Protocol):
    def get(self, lat: float, lng: float, source: str = "gps") -> Features: ...


def inside_malawi(lat: float, lng: float) -> bool:
    b = MALAWI_BBOX
    return b["lat_min"] <= lat <= b["lat_max"] and b["lng_min"] <= lng <= b["lng_max"]


class SampleFeatureProvider:
    def get(self, lat: float, lng: float, source: str = "gps") -> Features:
        if not inside_malawi(lat, lng):
            raise OutsideMalawiError("Location is outside Malawi")
        a = min(AREAS, key=lambda x: math.hypot(x["lat"] - lat, x["lng"] - lng))
        return Features(
            area_id=a["id"],
            name=("Near " if source == "gps" else "") + a["name"],
            lat=lat,
            lng=lng,
            source="gps" if source == "gps" else "area",
            region=a["region"],
            rain_avg_mm=a["rain_avg_mm"],
            outlook=a["outlook"],
            elevation_m=a["elevation_m"],
            slope_pct=a["slope_pct"],
            aez=a["aez"],
            aez_label=ZONES[a["aez"]]["label"],
            soil_class=a["soil_class"],
            soil_label=SOIL[a["soil_class"]]["label"],
            onset_month=ONSET_MONTH[a["region"]],
            feature_version=FEATURE_VERSION,
        )


def list_areas() -> list[Area]:
    return [Area(id=a["id"], name=a["name"], lat=a["lat"], lng=a["lng"]) for a in AREAS]


provider: FeatureProvider = SampleFeatureProvider()
