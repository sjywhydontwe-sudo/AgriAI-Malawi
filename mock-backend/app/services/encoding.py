"""One feature encoding, shared by training and serving.

The data/ML owner should import `encode_row` in the training notebook too, so that
historical IHS5 rows and new-farmer rows go through exactly the same transformation.

IHS5 source of each training column:
  rain_avg_mm   householdgeovariables_ihs5.anntot_avg
  outlook_*     (deployment only; set to "normal" for training rows, or use the season anomaly)
  elevation_m   householdgeovariables_ihs5.srtm_1k (or plot-level elevation)
  slope_pct     householdgeovariables_ihs5.afmnslp_pct (or plot-level slope)
  aez_*         householdgeovariables_ihs5.ssa_aez09
  soil_class    householdgeovariables_ihs5.sq1
  plant_season_idx  ag_mod_d.ag_d35_1a (month finished planting), rainy season only (ag_d35_1b)
  fert_kg_ha    (ag_mod_d.ag_d39d + ag_d39j) / plot area (prefer GPS-measured area)
  hybrid        seed type from the crop module
  intercrop     crop module: maize not planted on the entire plot / mixed stand
Target: maize yield kg/ha = harvest (converted to kg of shelled grain) / plot area.
"""
from ..data.reference import FERT_BAG_KG, season_idx
from ..schemas import Farm, Features

FEATURE_COLUMNS = [
    "rain_avg_mm", "outlook_above", "outlook_below", "elevation_m", "slope_pct",
    "aez_ws", "aez_cs", "aez_wsa", "soil_class",
    "plant_offset", "fert_kg_ha", "hybrid", "intercrop",
]


def fert_kg_ha(farm: Farm) -> float:
    return farm.fert_bags * FERT_BAG_KG / farm.area_ha


def plant_offset(features: Features, farm: Farm) -> int:
    """Months between usual first rains and planting, in farming-year order (negative = early)."""
    return season_idx(farm.plant_month) - season_idx(features.onset_month)


def encode_row(features: Features, farm: Farm) -> dict:
    return {
        "rain_avg_mm": features.rain_avg_mm,
        "outlook_above": int(features.outlook == "above"),
        "outlook_below": int(features.outlook == "below"),
        "elevation_m": features.elevation_m,
        "slope_pct": features.slope_pct,
        "aez_ws": int(features.aez == "ws"),
        "aez_cs": int(features.aez == "cs"),
        "aez_wsa": int(features.aez == "wsa"),
        "soil_class": features.soil_class,
        "plant_offset": plant_offset(features, farm),
        "fert_kg_ha": fert_kg_ha(farm),
        "hybrid": int(farm.seed == "hybrid"),
        "intercrop": int(farm.intercrop),
    }
