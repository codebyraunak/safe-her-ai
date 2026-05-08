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
from users import register_user, find_nearest_user

app = FastAPI(title="SafeHer AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    user_id: Optional[str] = None
    user_name: Optional[str] = "Anonymous"
    message: Optional[str] = ""
    emergency_contact: Optional[str] = None
    medical_details: Optional[str] = None

class UserRegisterRequest(BaseModel):
    user_id: str
    name: str
    emergency_contact: str
    medical_details: str
    lat: float
    lng: float

@app.get("/")
def root():
    return {"status": "SafeHer AI API running", "version": "1.0.0"}

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

@app.post("/api/route/score")
def route_score(req: RouteRequest):
    now = datetime.now()
    hour = req.hour if req.hour is not None else now.hour
    dow  = req.day_of_week if req.day_of_week is not None else now.weekday()
    wps  = [{"lat": w.lat, "lng": w.lng} for w in req.waypoints]
    return score_route(wps, hour, dow)

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

@app.post("/api/users/register")
def user_register(req: UserRegisterRequest):
    user = register_user(req.user_id, req.name, req.emergency_contact, req.medical_details, req.lat, req.lng)
    helper = find_nearest_user(req.lat, req.lng, exclude_user_id=req.user_id)
    return {"user": user, "nearest_helper": helper}

@app.get("/api/users/nearest-helper")
def nearest_helper(lat: float, lng: float, exclude_user_id: Optional[str] = None):
    helper = find_nearest_user(lat, lng, exclude_user_id)
    return {"nearest_helper": helper}

@app.post("/api/sos/trigger")
def sos_trigger(req: SOSRequest):
    alert = trigger_sos(
        req.lat,
        req.lng,
        req.user_name or "Anonymous",
        req.message or "",
        req.emergency_contact or "",
        req.medical_details or "",
    )
    helper = find_nearest_user(req.lat, req.lng, exclude_user_id=req.user_id)
    if helper:
        alert["nearest_helper"] = helper
    return alert

@app.get("/api/sos/log")
def sos_log():
    return {"alerts": get_sos_log(), "total": len(get_sos_log())}

@app.get("/api/sos/nearest-station")
def nearest_station(lat: float, lng: float):
    return find_nearest_station(lat, lng)

@app.post("/api/route/find-safe")
def find_safe_route(req: RouteRequest):
    import requests as req_lib

    start = req.waypoints[0]
    end = req.waypoints[-1]

    ORS_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjA2OTRlODNmYzNjODQ4ZjlhMDRlMDgyYTZkZjVkN2FkIiwiaCI6Im11cm11cjY0In0="

    scored_routes = []

    try:
        res = req_lib.post(
            "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
            headers={"Authorization": ORS_KEY, "Content-Type": "application/json"},
            json={
                "coordinates": [[start.lng, start.lat], [end.lng, end.lat]],
                "alternative_routes": {"share_factor": 0.6, "target_count": 3}
            }
        )
        print("ORS STATUS:", res.status_code)
        features = res.json()["features"]
        for i, feature in enumerate(features):
            coords = feature["geometry"]["coordinates"]
            step = max(1, len(coords) // 5)
            waypoints = [{"lat": c[1], "lng": c[0]} for c in coords[::step]][:5]
            score_result = score_route(waypoints, req.hour or 12, req.day_of_week or 0)
            scored_routes.append({
                "route_index": i,
                "coordinates": [[c[1], c[0]] for c in coords],
                "score": score_result["score"],
                "label": score_result["label"],
                "avg_risk": score_result["avg_risk"],
                "distance_m": feature["properties"]["summary"]["distance"],
                "duration_s": feature["properties"]["summary"]["duration"],
            })
    except Exception as e:
        print("ORS ERROR:", e)
        scored_routes = []

    scored_routes.sort(key=lambda x: x["score"], reverse=True)
    if scored_routes:
        scored_routes[0]["is_safest"] = True

    return {"routes": scored_routes, "total": len(scored_routes)}