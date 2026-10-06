"""API contract between the Next.js frontend and the Python backend.

These Pydantic models are the single source of truth. FastAPI publishes them at
/openapi.json and /docs; the frontend mirrors them in frontend/lib/types.ts.
"""
from typing import Literal, Optional, Union

from pydantic import BaseModel, Field

Region = Literal["north", "central", "south"]
Outlook = Literal["above", "normal", "below"]
Tone = Literal["ok", "gray", "warn", "bad"]
Source = Literal["model", "general"]


class Area(BaseModel):
    id: str
    name: str
    lat: float
    lng: float


class Features(BaseModel):
    """Environmental features for one location, defined exactly like the IHS5 training data."""

    area_id: str
    name: str = Field(description="Display name, e.g. 'Near Kasungu'")
    lat: float
    lng: float
    source: Literal["gps", "area"] = "gps"
    region: Region
    rain_avg_mm: float = Field(description="Long-term average July-June rainfall (IHS5 anntot_avg)")
    outlook: Outlook = Field(description="Seasonal rainfall outlook category")
    elevation_m: float = Field(description="Elevation, 1 km resolution (IHS5 srtm_1k)")
    slope_pct: float = Field(description="Slope in %, computed after aggregating DEM to 1 km")
    aez: str = Field(description="Agro-ecological zone code (IHS5 ssa_aez09)")
    aez_label: str
    soil_class: int = Field(ge=1, le=4, description="Nutrient availability class (IHS5 sq1)")
    soil_label: str
    onset_month: int = Field(ge=1, le=12, description="Usual month of first rains")
    feature_version: str


class Farm(BaseModel):
    """What the farmer enters. Encodings match IHS5 (see app/services/encoding.py)."""

    area_ha: float = Field(gt=0, le=50)
    plant_month: int = Field(ge=1, le=12, description="Month planting finished (IHS5 ag_d35_1a)")
    seed: Literal["hybrid", "local"]
    fert_bags: int = Field(ge=0, le=99, description="50 kg bags of inorganic fertilizer on the field")
    intercrop: bool = False


class Goal(BaseModel):
    target_bags: int = Field(ge=1, le=10000)
    bag_kg: Literal[50, 90] = 50
    price_mwk_per_kg: float = Field(gt=0, le=100000)


class BaselineRequest(BaseModel):
    features: Features
    farm: Farm


class BaselineResponse(BaseModel):
    typical_kg_ha: float


class PredictRequest(BaseModel):
    features: Features
    farm: Farm
    goal: Goal


class Bags(BaseModel):
    expected: int
    low: int
    high: int
    goal: int
    typical: int


class Option(BaseModel):
    value: Union[int, str, bool]
    label: str
    bags: int
    kg_ha: float
    is_current: bool
    tag: Optional[str] = None


class OptionGroup(BaseModel):
    key: Literal["plant_month", "seed", "fert"]
    label: str
    display: Literal["chart", "list"]
    options: list[Option]


class IntercropInfo(BaseModel):
    current: bool
    alternative_bags: int = Field(description="Maize bags if the intercrop choice were flipped")


class BestPlan(BaseModel):
    changes: list[str]
    bags: int
    reaches_goal: bool


class WhatIf(BaseModel):
    key: Literal["fert", "seed", "plant"]
    text: str
    bags: int
    gain_bags: int


class Condition(BaseModel):
    key: Literal["rain", "soil", "land", "zone"]
    label: str
    rating: str
    tone: Tone
    detail: str
    note: Optional[str] = None


class PredictResponse(BaseModel):
    yield_kg_ha: float
    low_kg_ha: float
    high_kg_ha: float
    typical_kg_ha: float
    fert_kg_ha: float
    bags: Bags
    value_mwk: int
    gap_bags: int = Field(description="expected - goal (negative means short)")
    missing_value_mwk: int
    choices: list[OptionGroup] = Field(description="Every number is a full model re-run with one choice changed")
    intercrop: IntercropInfo
    best_plan: Optional[BestPlan]
    what_if: list[WhatIf]
    conditions: list[Condition]
    below_normal_bags: Optional[int]
    summary: str
    model_version: str
    feature_version: str


class AdviseRequest(BaseModel):
    context: Optional[PredictRequest] = Field(None, description="Inputs of the estimate being discussed")
    question: str = Field(min_length=1, max_length=500)
    lang: Literal["en", "ny"] = "en"


class AdviseResponse(BaseModel):
    text: str = Field(description="Plain text. **bold** and lines starting with '- ' are allowed.")
    sources: list[Source]


class ApiError(BaseModel):
    detail: str
    code: str
