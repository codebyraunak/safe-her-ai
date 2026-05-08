from datetime import datetime
import random
import csv
from pathlib import Path

# ── Load full police station dataset from CSV ─────────────────────────────────
POLICE_STATIONS_FILE = Path(__file__).resolve().parent / "data" / "police_stations.csv"

def load_police_stations():
    stations = []
    if POLICE_STATIONS_FILE.exists():
        with POLICE_STATIONS_FILE.open(newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                stations.append({
                    "id": int(row["id"]),
                    "name": row["name"],
                    "lat": float(row["lat"]),
                    "lng": float(row["lng"]),
                    "contact": row.get("contact", ""),
                })
    return stations

POLICE_STATIONS = load_police_stations()

# In-memory SOS log (use DB in production)
SOS_LOG = []

def haversine_dist(lat1, lng1, lat2, lng2):
    import math
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def find_nearest_station(lat: float, lng: float) -> dict:
    nearest = min(
        POLICE_STATIONS,
        key=lambda s: haversine_dist(lat, lng, s["lat"], s["lng"])
    )
    dist = haversine_dist(lat, lng, nearest["lat"], nearest["lng"])
    return {**nearest, "distance_km": round(dist, 2)}

def trigger_sos(lat: float, lng: float, user_name: str = "Anonymous", message: str = "", emergency_contact: str = "", medical_details: str = "") -> dict:
    station = find_nearest_station(lat, lng)
    alert_id = f"SOS-{random.randint(10000, 99999)}"
    timestamp = datetime.now().isoformat()

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
        "estimated_response_min": round(station["distance_km"] / 0.5, 1),  # ~30km/h city speed
        "live_location_url": f"https://maps.google.com/?q={lat},{lng}",
    }

    SOS_LOG.append(alert)

    # In production: send SMS via Twilio / webhook to police dashboard
    print(f"[SOS ALERT] {alert_id} → {station['name']} | User: {user_name} | Loc: {lat},{lng}")

    return alert

def get_sos_log() -> list:
    return SOS_LOG
