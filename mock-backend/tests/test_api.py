from fastapi.testclient import TestClient

from app.main import app

c = TestClient(app)


def _features(lat=-13.03, lng=33.48):
    r = c.get("/api/features", params={"lat": lat, "lng": lng, "source": "area"})
    assert r.status_code == 200, r.text
    return r.json()


def _req(**farm):
    f = _features()
    base = {"area_ha": 1.0, "plant_month": 1, "seed": "local", "fert_bags": 0, "intercrop": False}
    base.update(farm)
    return {"features": f, "farm": base, "goal": {"target_bags": 35, "bag_kg": 50, "price_mwk_per_kg": 500}}


def test_health_and_areas():
    assert c.get("/api/health").json()["status"] == "ok"
    assert len(c.get("/api/areas").json()) >= 6


def test_outside_malawi():
    r = c.get("/api/features", params={"lat": 40.4, "lng": -79.9})
    assert r.status_code == 422 and r.json()["code"] == "outside_malawi"


def test_predict_shape_and_consistency():
    r = c.post("/api/predict", json=_req())
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["bags"]["low"] <= p["bags"]["expected"] <= p["bags"]["high"]
    months = next(g for g in p["choices"] if g["key"] == "plant_month")["options"]
    assert len(months) == 12 and months[0]["label"] == "July"
    cur = [o for g in p["choices"] for o in g["options"] if o["is_current"]]
    assert all(o["bags"] == p["bags"]["expected"] for o in cur)  # current option == headline number
    assert p["best_plan"]["bags"] >= max(o["bags"] for g in p["choices"] for o in g["options"] if g["key"] != "plant_month")


def test_monotonic_fertilizer():
    p = c.post("/api/predict", json=_req()).json()
    fert = next(g for g in p["choices"] if g["key"] == "fert")["options"]
    assert [o["bags"] for o in fert] == sorted(o["bags"] for o in fert)


def test_validation():
    bad = _req(); bad["farm"]["plant_month"] = 13
    assert c.post("/api/predict", json=bad).status_code == 422


def test_advise_grounded():
    req = _req()
    p = c.post("/api/predict", json=req).json()
    a = c.post("/api/advise", json={"context": req, "question": "How can I reach my goal?"}).json()
    assert "model" in a["sources"] and str(p["what_if"][0]["bags"]) in a["text"]
    g = c.post("/api/advise", json={"question": "How do I store maize?"}).json()
    assert g["sources"] == ["general"]
