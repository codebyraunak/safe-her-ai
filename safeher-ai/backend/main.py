from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

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
from sos import trigger_sos, get_sos_log, find_nearest_station

app = FastAPI(title="SafeHer AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request models ─────────────────────────────────────────────────────────────
class ZoneRequest(BaseModel):
    lat: float
    lng: float
    hour: Optional[int] = None
    day_of_week: Optional[int] = None
    lighting: Optional[str] = "dim"

class HeatmapRequest(BaseModel):
    center_lat: float
    center_lng: float
    hour: Optional[int] = None
    day_of_week: Optional[int] = None

class Waypoint(BaseModel):
    lat: float
    lng: float

class RouteRequest(BaseModel):
    waypoints: List[Waypoint]
    hour: Optional[int] = None
    day_of_week: Optional[int] = None

class LightingRequest(BaseModel):
    lat: float
    lng: float
    hour: Optional[int] = None
    is_emergency: Optional[bool] = False

class SOSRequest(BaseModel):
    lat: float
    lng: float
    user_name: Optional[str] = "Anonymous"
    message: Optional[str] = ""

# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "SafeHer AI API running", "version": "1.0.0"}

# ── Heatmap ────────────────────────────────────────────────────────────────────
@app.post("/api/heatmap")
def heatmap(req: HeatmapRequest):
    now = datetime.now()
    hour = req.hour if req.hour is not None else now.hour
    dow  = req.day_of_week if req.day_of_week is not None else now.weekday()
    points = generate_heatmap(req.center_lat, req.center_lng, hour, dow)
    return {"points": points, "total": len(points), "hour": hour}

@app.post("/api/zone/risk")
def zone_risk(req: ZoneRequest):
    now = datetime.now()
    hour = req.hour if req.hour is not None else now.hour
    dow  = req.day_of_week if req.day_of_week is not None else now.weekday()
    return predict_zone_risk(req.lat, req.lng, hour, dow, req.lighting or "dim")

@app.get("/api/hotspots")
def hotspots():
    clusters = get_hotspot_clusters()
    return {"clusters": clusters, "total": len(clusters)}

# ── Route scorer ───────────────────────────────────────────────────────────────
@app.post("/api/route/score")
def route_score(req: RouteRequest):
    now = datetime.now()
    hour = req.hour if req.hour is not None else now.hour
    dow  = req.day_of_week if req.day_of_week is not None else now.weekday()
    wps  = [{"lat": w.lat, "lng": w.lng} for w in req.waypoints]
    return score_route(wps, hour, dow)

# ── Smart lighting ─────────────────────────────────────────────────────────────
@app.post("/api/lighting/zone")
def lighting_zone(req: LightingRequest):
    return get_zone_lighting(req.lat, req.lng, req.hour, req.is_emergency or False)

@app.post("/api/lighting/map")
def lighting_map(req: HeatmapRequest):
    now  = datetime.now()
    hour = req.hour if req.hour is not None else now.hour
    zones = generate_lighting_map(req.center_lat, req.center_lng, hour)
    return {"zones": zones, "total": len(zones), "hour": hour}

@app.get("/api/lighting/savings")
def lighting_savings(num_zones: int = 100):
    return calculate_city_savings(num_zones)

# ── SOS ────────────────────────────────────────────────────────────────────────
@app.post("/api/sos/trigger")
def sos_trigger(req: SOSRequest):
    alert = trigger_sos(req.lat, req.lng, req.user_name or "Anonymous", req.message or "")
    return alert

@app.get("/api/sos/log")
def sos_log():
    return {"alerts": get_sos_log(), "total": len(get_sos_log())}

@app.get("/api/sos/nearest-station")
def nearest_station(lat: float, lng: float):
    return find_nearest_station(lat, lng)
