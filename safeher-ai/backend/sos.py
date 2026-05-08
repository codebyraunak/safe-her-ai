from datetime import datetime
import random
import csv
import math
from pathlib import Path

# ── Load full police station dataset from CSV ─────────────────────────────────
POLICE_STATIONS_FILE = Path(__file__).resolve().parent / "data" / "police_stations.csv"

def load_police_stations() -> list:
    stations = []
    if not POLICE_STATIONS_FILE.exists():
        # FIX: Warn clearly instead of silently returning empty list — SOS with no
        # stations would produce a misleading crash in find_nearest_station()
        print(
            f"[WARNING] police_stations.csv not found at {POLICE_STATIONS_FILE}. "
            "SOS dispatch will be unavailable until this file is provided."
        )
        return stations

    with POLICE_STATIONS_FILE.open(newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            try:
                stations.append({
                    "id": int(row["id"]),
                    "name": row["name"],
                    "lat": float(row["lat"]),
                    "lng": float(row["lng"]),
                    "contact": row.get("contact", ""),
                })
            except (KeyError, ValueError) as e:
                print(f"[WARNING] Skipping malformed police station row: {row} — {e}")
    return stations

POLICE_STATIONS = load_police_stations()

# In-memory SOS log (use a database in production)
SOS_LOG: list = []

# ── Distance helpers ──────────────────────────────────────────────────────────

def haversine_dist(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

# ── Station finders ───────────────────────────────────────────────────────────

def find_nearest_station(lat: float, lng: float) -> dict:
    # FIX: Guard against empty station list — previously would crash with ValueError
    if not POLICE_STATIONS:
        raise ValueError(
            "No police stations loaded. Please add backend/data/police_stations.csv."
        )
    nearest = min(POLICE_STATIONS, key=lambda s: haversine_dist(lat, lng, s["lat"], s["lng"]))
    dist = haversine_dist(lat, lng, nearest["lat"], nearest["lng"])
    return {**nearest, "distance_km": round(dist, 2)}

def find_all_stations(lat: float, lng: float) -> list:
    if not POLICE_STATIONS:
        raise ValueError(
            "No police stations loaded. Please add backend/data/police_stations.csv."
        )
    stations = [
        {**s, "distance_km": round(haversine_dist(lat, lng, s["lat"], s["lng"]), 2)}
        for s in POLICE_STATIONS
    ]
    return sorted(stations, key=lambda s: s["distance_km"])

# ── SOS trigger ───────────────────────────────────────────────────────────────

def trigger_sos(
    lat: float,
    lng: float,
    user_name: str = "Anonymous",
    message: str = "",
    emergency_contact: str = "",
    medical_details: str = "",
) -> dict:
    station   = find_nearest_station(lat, lng)   # raises ValueError if no stations
    alert_id  = f"SOS-{random.randint(10000, 99999)}"
    timestamp = datetime.now().isoformat()

    # FIX: Estimate response time more realistically (30 km/h average city speed)
    estimated_response = round((station["distance_km"] / 30) * 60, 1)  # minutes

    alert = {
        "alert_id": alert_id,
        "timestamp": timestamp,
        "user": user_name,
        "location": {"lat": lat, "lng": lng},
        "message": message or "Emergency SOS triggered",
        "emergency_contact": emergency_contact,
        "medical_details": medical_details,
        "nearest_station": station,
        "status": "DISPATCHED",
        "estimated_response_min": estimated_response,
        "live_location_url": f"https://maps.google.com/?q={lat},{lng}",
    }

    SOS_LOG.append(alert)

    # In production: send SMS via Twilio / push alert to police dashboard
    print(
        f"[SOS ALERT] {alert_id} → {station['name']} | "
        f"User: {user_name} | Loc: {lat},{lng} | "
        f"ETA: ~{estimated_response} min"
    )

    return alert

def get_sos_log() -> list:
    return SOS_LOG
