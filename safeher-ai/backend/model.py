import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import LabelEncoder
import os

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "incidents.csv")

# ── Load & train ──────────────────────────────────────────────────────────────
def load_and_train():
    df = pd.read_csv(DATA_PATH)

    le = LabelEncoder()
    df["incident_enc"] = le.fit_transform(df["incident_type"])
    df["lighting_enc"] = le.fit_transform(df["lighting"])

    features = ["incident_enc", "hour", "day_of_week", "lighting_enc"]
    X = df[features]
    y = df["risk_level"]

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    return model, df, le

MODEL, DF, LE = load_and_train()

# ── DBSCAN hotspot clustering ─────────────────────────────────────────────────
def get_hotspot_clusters():
    coords = DF[["lat", "lng"]].values
    coords_rad = np.radians(coords)
    db = DBSCAN(eps=0.5 / 6371, min_samples=2, algorithm="ball_tree", metric="haversine")
    labels = db.fit_predict(coords_rad)

    clusters = []
    for label in set(labels):
        if label == -1:
            continue
        mask = labels == label
        cluster_points = DF[mask]
        clusters.append({
            "cluster_id": int(label),
            "center_lat": float(cluster_points["lat"].mean()),
            "center_lng": float(cluster_points["lng"].mean()),
            "incident_count": int(mask.sum()),
            "avg_risk": float(cluster_points["risk_level"].mean()),
            "dominant_type": cluster_points["incident_type"].mode()[0],
        })
    return clusters

# ── Predict risk for a zone ───────────────────────────────────────────────────
def predict_zone_risk(lat: float, lng: float, hour: int, day_of_week: int, lighting: str = "dim"):
    try:
        lighting_enc = LE.transform([lighting])[0]
    except Exception:
        lighting_enc = 1

    # Find nearest incidents
    dists = np.sqrt((DF["lat"] - lat) ** 2 + (DF["lng"] - lng) ** 2)
    nearest = DF.loc[dists.idxmin()]
    incident_enc = nearest["incident_enc"]

    features = pd.DataFrame([[incident_enc, hour, day_of_week, lighting_enc]],
                            columns=["incident_enc", "hour", "day_of_week", "lighting_enc"])
    risk = int(MODEL.predict(features)[0])
    proba = MODEL.predict_proba(features)[0]

    return {
        "lat": lat,
        "lng": lng,
        "risk_level": risk,
        "risk_label": ["Very Low", "Low", "Moderate", "High", "Critical"][min(risk - 1, 4)],
        "confidence": float(max(proba)),
        "hour": hour,
        "lighting": lighting,
    }

# ── Generate heatmap grid ─────────────────────────────────────────────────────
def generate_heatmap(center_lat: float, center_lng: float, hour: int, day_of_week: int):
    points = []
    for dlat in np.arange(-0.02, 0.022, 0.005):
        for dlng in np.arange(-0.02, 0.022, 0.005):
            lat = round(center_lat + dlat, 5)
            lng = round(center_lng + dlng, 5)
            lighting = "none" if hour >= 21 or hour <= 5 else "dim" if hour >= 18 else "good"
            result = predict_zone_risk(lat, lng, hour, day_of_week, lighting)
            points.append({
                "lat": lat,
                "lng": lng,
                "risk": result["risk_level"],
                "label": result["risk_label"],
            })
    return points

# ── Route safety score ────────────────────────────────────────────────────────
def score_route(waypoints: list, hour: int, day_of_week: int):
    scores = []
    for wp in waypoints:
        result = predict_zone_risk(wp["lat"], wp["lng"], hour, day_of_week)
        scores.append(result["risk_level"])

    if not scores:
        return {"score": 100, "label": "Unknown", "risk_level": 0}

    avg_risk = np.mean(scores)
    safety_score = max(0, int(100 - (avg_risk / 5) * 100))

    if safety_score >= 80:
        label = "Safe"
    elif safety_score >= 60:
        label = "Moderate Risk"
    elif safety_score >= 40:
        label = "High Risk"
    else:
        label = "Critical — Avoid"

    return {
        "score": safety_score,
        "label": label,
        "avg_risk": round(avg_risk, 2),
        "zone_breakdown": scores,
    }
