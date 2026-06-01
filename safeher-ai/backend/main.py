from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)

from model import (
    generate_heatmap,
    predict_zone_risk,
    get_hotspot_clusters,
    score_route,
)
from lighting import (
    get_zone_lighting,
    generate_lighting_map,
    calculate_city_savings,
)
from sos import trigger_sos, get_sos_log, find_nearest_station, find_all_stations
from users import register_user, find_nearest_user
from safewalk import SafeWalkStartRequest, start_safe_walk, cancel_safe_walk, extend_safe_walk, check_active_walks
from safespots import get_safe_spots
import asyncio

app = FastAPI(
    title="SafeHer AI API",
    version="1.0.0",
    description="Women Safety & Intelligent Street Lighting Platform",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
# FIX: Restrict origins in production via environment variable instead of allow_origins=["*"]
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(check_active_walks())


# ── Request Models ─────────────────────────────────────────────────────────────

class ZoneRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    hour: Optional[int] = Field(None, ge=0, le=23)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    lighting: Optional[str] = "dim"

    @validator("lighting")
    def validate_lighting(cls, v):
        allowed = {"none", "dim", "good"}
        if v not in allowed:
            raise ValueError(f"lighting must be one of {allowed}")
        return v

class HeatmapRequest(BaseModel):
    center_lat: float = Field(..., ge=-90, le=90)
    center_lng: float = Field(..., ge=-180, le=180)
    hour: Optional[int] = Field(None, ge=0, le=23)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)

class Waypoint(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)

class RouteRequest(BaseModel):
    waypoints: List[Waypoint] = Field(..., min_items=2)  # FIX: Require at least 2 waypoints
    hour: Optional[int] = Field(None, ge=0, le=23)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)

class LightingRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    hour: Optional[int] = Field(None, ge=0, le=23)
    is_emergency: Optional[bool] = False

class SOSRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    user_id: Optional[str] = None
    user_name: Optional[str] = "Anonymous"
    message: Optional[str] = ""
    emergency_contact: Optional[str] = None
    medical_details: Optional[str] = None

class UserRegisterRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    emergency_contact: str = Field(..., min_length=1)
    medical_details: str = ""
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)

class DangerPinRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    type: str
    description: Optional[str] = ""


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status": "SafeHer AI API running",
        "version": "1.0.0",
        "docs": "/docs",
    }

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

# ── Heatmap & Risk ─────────────────────────────────────────────────────────────

@app.post("/api/heatmap")
def heatmap(req: HeatmapRequest):
    now = datetime.now()
    hour = req.hour if req.hour is not None else now.hour
    dow  = req.day_of_week if req.day_of_week is not None else now.weekday()
    try:
        points = generate_heatmap(req.center_lat, req.center_lng, hour, dow)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Heatmap generation failed: {str(e)}")
    return {"points": points, "total": len(points), "hour": hour}

@app.post("/api/zone/risk")
def zone_risk(req: ZoneRequest):
    now = datetime.now()
    hour = req.hour if req.hour is not None else now.hour
    dow  = req.day_of_week if req.day_of_week is not None else now.weekday()
    try:
        return predict_zone_risk(req.lat, req.lng, hour, dow, req.lighting or "dim")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk prediction failed: {str(e)}")

@app.get("/api/hotspots")
def hotspots():
    try:
        clusters = get_hotspot_clusters()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hotspot clustering failed: {str(e)}")
    return {"clusters": clusters, "total": len(clusters)}

@app.get("/api/geocode")
def geocode(q: str):
    import requests as req_lib
    try:
        res = req_lib.get(
            f"https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=5",
            headers={"User-Agent": "SafeHerAI/1.0 (https://github.com/codebyraunak/safe-her-ai)"},
            timeout=5
        )
        res.raise_for_status()
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Route Scoring ──────────────────────────────────────────────────────────────

@app.post("/api/route/score")
def route_score(req: RouteRequest):
    now = datetime.now()
    hour = req.hour if req.hour is not None else now.hour
    dow  = req.day_of_week if req.day_of_week is not None else now.weekday()
    wps  = [{"lat": w.lat, "lng": w.lng} for w in req.waypoints]
    try:
        return score_route(wps, hour, dow)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Route scoring failed: {str(e)}")

@app.post("/api/route/find-safe")
def find_safe_route(req: RouteRequest):
    import requests as req_lib

    start = req.waypoints[0]
    end   = req.waypoints[-1]

    # FIX: Load API key from environment variable — never hardcode secrets
    ORS_KEY = os.getenv("ORS_API_KEY", "")
    # If ORS API key is not set, gracefully fallback to a straight-line route
    # and score it locally instead of returning an error. This keeps the
    # frontend usable in development without external API keys.
    if not ORS_KEY:
        # build a few simple waypoints (start -> midpoint -> end)
        waypoints = [
            {"lat": start.lat, "lng": start.lng},
            {"lat": (start.lat + end.lat) / 2, "lng": (start.lng + end.lng) / 2},
            {"lat": end.lat, "lng": end.lng},
        ]
        try:
            scored = score_route(waypoints, hour, dow)
            route = {
                "route_index": 0,
                "coordinates": [[w["lat"], w["lng"]] for w in waypoints],
                "score": scored["score"] if isinstance(scored, dict) and "score" in scored else scored,
                "label": scored.get("label") if isinstance(scored, dict) else "",
                "avg_risk": scored.get("avg_risk") if isinstance(scored, dict) else None,
                "distance_m": None,
                "duration_s": None,
                "is_safest": True,
            }
            return {"routes": [route], "total": 1}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Route scoring failed: {str(e)}")

    now  = datetime.now()
    hour = req.hour if req.hour is not None else now.hour
    dow  = req.day_of_week if req.day_of_week is not None else now.weekday()

    try:
        res = req_lib.post(
            "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
            headers={"Authorization": ORS_KEY, "Content-Type": "application/json"},
            json={
                "coordinates": [[start.lng, start.lat], [end.lng, end.lat]],
                "alternative_routes": {
                    "share_factor": 0.3,
                    "target_count": 3,
                    "weight_factor": 2.0
                },
            },
            timeout=10,  # FIX: Always set a timeout for external HTTP calls
        )
        res.raise_for_status()
        features = res.json().get("features", [])
    except req_lib.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Route service timed out.")
    except req_lib.exceptions.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Route service error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

    scored_routes = []
    for i, feature in enumerate(features):
        coords = feature["geometry"]["coordinates"]
        step = max(1, len(coords) // 50)
        waypoints = [{"lat": c[1], "lng": c[0]} for c in coords[::step]][:50]
        score_result = score_route(waypoints, hour, dow)
        summary = feature["properties"]["summary"]
        scored_routes.append({
            "route_index": i,
            "coordinates": [[c[1], c[0]] for c in coords],
            "score": score_result["score"],
            "label": score_result["label"],
            "avg_risk": score_result["avg_risk"],
            "distance_m": summary["distance"],
            "duration_s": summary["duration"],
            "is_safest": False,
        })

    scored_routes.sort(key=lambda x: x["score"], reverse=True)
    if scored_routes:
        scored_routes[0]["is_safest"] = True

    return {"routes": scored_routes, "total": len(scored_routes)}

# ── Lighting ───────────────────────────────────────────────────────────────────

@app.post("/api/lighting/zone")
def lighting_zone(req: LightingRequest):
    try:
        return get_zone_lighting(req.lat, req.lng, req.hour, req.is_emergency or False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/lighting/map")
def lighting_map(req: HeatmapRequest):
    now  = datetime.now()
    hour = req.hour if req.hour is not None else now.hour
    try:
        zones = generate_lighting_map(req.center_lat, req.center_lng, hour)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"zones": zones, "total": len(zones), "hour": hour}

@app.get("/api/lighting/savings")
def lighting_savings(num_zones: int = 100):
    if num_zones < 1 or num_zones > 10000:
        raise HTTPException(status_code=400, detail="num_zones must be between 1 and 10000")
    try:
        return calculate_city_savings(num_zones)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Users ──────────────────────────────────────────────────────────────────────

@app.post("/api/users/register")
def user_register(req: UserRegisterRequest):
    try:
        user   = register_user(req.user_id, req.name, req.emergency_contact, req.medical_details, req.lat, req.lng)
        helper = find_nearest_user(req.lat, req.lng, exclude_user_id=req.user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"user": user, "nearest_helper": helper}

@app.get("/api/users/nearest-helper")
def nearest_helper(lat: float, lng: float, exclude_user_id: Optional[str] = None):
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates")
    helper = find_nearest_user(lat, lng, exclude_user_id)
    return {"nearest_helper": helper}

# ── SOS ────────────────────────────────────────────────────────────────────────

@app.post("/api/sos/trigger")
def sos_trigger(req: SOSRequest):
    # FIX: Guard against empty POLICE_STATIONS list before triggering
    try:
        alert = trigger_sos(
            req.lat,
            req.lng,
            req.user_name or "Anonymous",
            req.message or "",
            req.emergency_contact or "",
            req.medical_details or "",
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    helper = find_nearest_user(req.lat, req.lng, exclude_user_id=req.user_id)
    if helper:
        alert["nearest_helper"] = helper
    return alert

@app.get("/api/sos/log")
def sos_log():
    log = get_sos_log()
    return {"alerts": log, "total": len(log)}

@app.get("/api/sos/nearest-station")
def nearest_station(lat: float, lng: float):
    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates")
    try:
        stations = find_all_stations(lat, lng)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return {
        "nearest_station": stations[0] if stations else None,
        "stations": stations,
    }

# ── Crowd-Sourced Pins ─────────────────────────────────────────────────────────

@app.post("/api/pins/report")
def report_danger_pin(req: DangerPinRequest):
    import json
    pins_file = os.path.join(os.path.dirname(__file__), "data", "danger_pins.json")
    pins = []
    if os.path.exists(pins_file):
        with open(pins_file, "r") as f:
            try:
                pins = json.load(f)
            except json.JSONDecodeError:
                pass
    new_pin = req.dict()
    new_pin["timestamp"] = datetime.now().isoformat()
    pins.append(new_pin)
    with open(pins_file, "w") as f:
        json.dump(pins, f, indent=2)
    return {"status": "success", "pin": new_pin}

@app.get("/api/pins")
def get_danger_pins():
    import json
    pins_file = os.path.join(os.path.dirname(__file__), "data", "danger_pins.json")
    if os.path.exists(pins_file):
        with open(pins_file, "r") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

# ── Safe Walk Mode ─────────────────────────────────────────────────────────────

@app.post("/api/safewalk/start")
def api_start_safe_walk(req: SafeWalkStartRequest):
    return start_safe_walk(req)

@app.post("/api/safewalk/cancel")
def api_cancel_safe_walk(user_id: str):
    return cancel_safe_walk(user_id)

@app.post("/api/safewalk/extend")
def api_extend_safe_walk(user_id: str, minutes: int = 15):
    return extend_safe_walk(user_id, minutes)

# ── Safe Spots Layer ───────────────────────────────────────────────────────────

@app.get("/api/safe-spots")
def api_get_safe_spots(lat: float, lng: float, radius: int = 2000):
    return get_safe_spots(lat, lng, radius)

# ── Incident History Feed ───────────────────────────────────────────────────────

@app.get("/api/incidents/history")
def api_get_incident_history():
    import pandas as pd
    from datetime import datetime, timedelta
    data_path = os.path.join(os.path.dirname(__file__), "data", "incidents.csv")
    if not os.path.exists(data_path):
        return {"incidents": []}
        
    df = pd.read_csv(data_path)
    # Sort by some logic or just take last N rows. 
    # The dataset might not have real timestamps, so let's synthesize recent times
    recent = df.tail(15).copy()
    
    incidents = []
    now = datetime.now()
    for i, row in enumerate(recent.itertuples()):
        # Mock recent time: from 1 min ago to 5 hours ago
        time_diff = timedelta(minutes=i*15 + 2)
        inc_time = now - time_diff
        
        incidents.append({
            "id": getattr(row, "id", i),
            "type": getattr(row, "incident_type", "Unknown").title(),
            "lat": getattr(row, "lat", 0),
            "lng": getattr(row, "lng", 0),
            "area": getattr(row, "area", "Unknown Area"),
            "time": inc_time.isoformat(),
            "relative_time": f"{int(time_diff.total_seconds() // 60)} mins ago" if time_diff.total_seconds() < 3600 else f"{int(time_diff.total_seconds() // 3600)} hours ago"
        })
    
    return {"incidents": incidents[::-1]}



