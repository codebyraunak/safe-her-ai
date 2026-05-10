import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import LabelEncoder
import os
from functools import lru_cache

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "incidents.csv")

# ── Load & train ──────────────────────────────────────────────────────────────

def load_and_train():
    # FIX: Raise a clear error if the CSV is missing instead of a cryptic crash
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"Training data not found at: {DATA_PATH}\n"
            "Please place incidents.csv inside the backend/data/ directory."
        )

    df = pd.read_csv(DATA_PATH)

    required_cols = {"incident_type", "lighting", "hour", "day_of_week", "risk_level", "lat", "lng"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"incidents.csv is missing required columns: {missing}")

    # FIX: Use separate LabelEncoders so one does not overwrite the other
    incident_le = LabelEncoder()
    lighting_le = LabelEncoder()

    df["incident_enc"] = incident_le.fit_transform(df["incident_type"])
    df["lighting_enc"] = lighting_le.fit_transform(df["lighting"])

    features = ["incident_enc", "hour", "day_of_week", "lighting_enc"]
    X = df[features]
    y = df["risk_level"]

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)

    return model, df, incident_le, lighting_le


MODEL, DF, INCIDENT_LE, LIGHTING_LE = load_and_train()

RISK_LABELS = ["Very Low", "Low", "Moderate", "High", "Critical"]

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

@lru_cache(maxsize=2048)
def predict_zone_risk(lat: float, lng: float, hour: int, day_of_week: int, lighting: str = "dim") -> dict:
    # FIX: Use LIGHTING_LE (not INCIDENT_LE) for lighting encoding; fall back gracefully
    known_lightings = list(LIGHTING_LE.classes_)
    if lighting not in known_lightings:
        lighting_enc = known_lightings.index("dim") if "dim" in known_lightings else 0
    else:
        lighting_enc = int(LIGHTING_LE.transform([lighting])[0])

    # Find k=5 nearest incident rows by Euclidean distance on lat/lng
    k = 5
    dists = np.sqrt((DF["lat"] - lat) ** 2 + (DF["lng"] - lng) ** 2)
    nearest_indices = dists.nsmallest(k).index
    nearest_incident_encs = DF.loc[nearest_indices, "incident_enc"].values

    features = pd.DataFrame({
        "incident_enc": nearest_incident_encs,
        "hour": [hour] * k,
        "day_of_week": [day_of_week] * k,
        "lighting_enc": [lighting_enc] * k
    })
    
    predicted_risks = MODEL.predict(features)
    predicted_probas = MODEL.predict_proba(features)
    
    # Apply Inverse Distance Weighting (IDW)
    d_i = dists.loc[nearest_indices].values
    w_i = 1.0 / (d_i**2 + 1e-6)
    interpolated_risk = np.sum(w_i * predicted_risks) / np.sum(w_i)
    
    risk = int(round(interpolated_risk))
    
    # Calculate a weighted average confidence (optional but good for the UI)
    max_probas = np.max(predicted_probas, axis=1)
    proba = np.sum(w_i * max_probas) / np.sum(w_i)

    risk_idx = min(risk - 1, len(RISK_LABELS) - 1)
    risk_idx = max(risk_idx, 0)  # Guard against risk_level = 0 causing index -1

    return {
        "lat": lat,
        "lng": lng,
        "risk_level": risk,
        "risk_label": RISK_LABELS[risk_idx],
        "confidence": round(float(proba), 4),
        "hour": hour,
        "day_of_week": day_of_week,
        "lighting": lighting,
    }

# ── Generate heatmap grid ─────────────────────────────────────────────────────

def generate_heatmap(center_lat: float, center_lng: float, hour: int, day_of_week: int) -> list:
    points = []
    
    import json
    pins_file = os.path.join(os.path.dirname(__file__), "data", "danger_pins.json")
    danger_pins = []
    if os.path.exists(pins_file):
        with open(pins_file, "r") as f:
            try:
                danger_pins = json.load(f)
            except json.JSONDecodeError:
                pass

    for dlat in np.arange(-0.08, 0.085, 0.01):
        for dlng in np.arange(-0.08, 0.085, 0.01):
            lat = round(center_lat + float(dlat), 5)
            lng = round(center_lng + float(dlng), 5)
            # Determine lighting based on time of day
            if hour >= 21 or hour <= 5:
                lighting = "none"
            elif hour >= 18:
                lighting = "dim"
            else:
                lighting = "good"
            result = predict_zone_risk(lat, lng, hour, day_of_week, lighting)
            
            risk = result["risk_level"]
            
            # Apply user danger pins to increase risk
            for pin in danger_pins:
                dist = np.sqrt((pin["lat"] - lat)**2 + (pin["lng"] - lng)**2)
                if dist < 0.015:  # Within approx ~1.5km
                    risk = min(5, risk + 2)  # Increase risk significantly
            
            risk_idx = min(risk - 1, len(RISK_LABELS) - 1)
            risk_idx = max(risk_idx, 0)
            
            points.append({
                "lat": lat,
                "lng": lng,
                "risk": risk,
                "label": RISK_LABELS[risk_idx],
            })
    return points

# ── Route safety score ────────────────────────────────────────────────────────

def score_route(waypoints: list, hour: int, day_of_week: int) -> dict:
    if not waypoints:
        return {"score": 100, "label": "Unknown", "avg_risk": 0.0, "zone_breakdown": []}

    from lighting import get_zone_lighting

    scores = []
    for wp in waypoints:
        # Get real lighting data for this point
        light_data = get_zone_lighting(wp["lat"], wp["lng"], hour)
        mode = light_data.get("mode", "Dim")
        
        # Map lighting mode to ML model input categories
        if mode in ["Full", "Active"]:
            lighting_cat = "good"
        elif mode in ["No Light", "Broken"]:
            lighting_cat = "none"
        else:
            lighting_cat = "dim"
            
        result = predict_zone_risk(wp["lat"], wp["lng"], hour, day_of_week, lighting=lighting_cat)
        scores.append(result["risk_level"])

    avg_risk = float(np.mean(scores))
    # FIX: Use consistent max risk scale (5) to compute safety score
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
