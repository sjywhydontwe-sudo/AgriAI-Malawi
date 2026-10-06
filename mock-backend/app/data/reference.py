"""Reference tables and SAMPLE location data.

Everything in AREAS is illustrative so the app runs end to end. The geospatial owner
replaces app/services/features.py with real raster lookups; nothing else needs to change.
"""

# Sample district centres with sample feature values.
AREAS = [
    {"id": "lilongwe", "name": "Lilongwe", "lat": -13.98, "lng": 33.78, "region": "central",
     "rain_avg_mm": 860, "outlook": "normal", "elevation_m": 1080, "slope_pct": 3, "aez": "ws", "soil_class": 2},
    {"id": "kasungu", "name": "Kasungu", "lat": -13.03, "lng": 33.48, "region": "central",
     "rain_avg_mm": 810, "outlook": "normal", "elevation_m": 1010, "slope_pct": 2, "aez": "ws", "soil_class": 2},
    {"id": "mzimba", "name": "Mzimba", "lat": -11.90, "lng": 33.60, "region": "north",
     "rain_avg_mm": 780, "outlook": "above", "elevation_m": 1350, "slope_pct": 6, "aez": "cs", "soil_class": 3},
    {"id": "zomba", "name": "Zomba", "lat": -15.38, "lng": 35.32, "region": "south",
     "rain_avg_mm": 1020, "outlook": "normal", "elevation_m": 900, "slope_pct": 11, "aez": "ws", "soil_class": 1},
    {"id": "blantyre", "name": "Blantyre", "lat": -15.79, "lng": 35.00, "region": "south",
     "rain_avg_mm": 940, "outlook": "normal", "elevation_m": 1040, "slope_pct": 9, "aez": "ws", "soil_class": 2},
    {"id": "chikwawa", "name": "Chikwawa", "lat": -16.03, "lng": 34.80, "region": "south",
     "rain_avg_mm": 620, "outlook": "below", "elevation_m": 110, "slope_pct": 2, "aez": "wsa", "soil_class": 3},
]

# Rough Malawi bounding box used to reject locations outside the country.
MALAWI_BBOX = {"lat_min": -17.2, "lat_max": -9.3, "lng_min": 32.6, "lng_max": 36.0}

ZONES = {
    "ws": {"label": "Tropic-warm / subhumid"},
    "cs": {"label": "Tropic-cool / subhumid"},
    "wsa": {"label": "Tropic-warm / semiarid"},
}

SOIL = {
    1: {"label": "Good", "tone": "ok"},
    2: {"label": "Some limits", "tone": "gray"},
    3: {"label": "Poor", "tone": "warn"},
    4: {"label": "Very poor", "tone": "bad"},
}

OUTLOOK = {
    "above": {"label": "Above normal", "tone": "ok"},
    "normal": {"label": "Normal", "tone": "gray"},
    "below": {"label": "Below normal", "tone": "warn"},
}

ONSET_MONTH = {"central": 11, "south": 11, "north": 12}  # sample

MONTHS = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]

FERT_BAG_KG = 50
RECOMMENDED_FERT_KG_HA = 200  # sample; agronomy owner to confirm


def season_idx(month: int) -> int:
    """Position in the farming year that starts in July (Jul=0 ... Jun=11)."""
    return (month - 7) % 12


def recommended_fert_bags(area_ha: float) -> int:
    import math
    return max(1, math.ceil(RECOMMENDED_FERT_KG_HA * area_ha / FERT_BAG_KG))
