from datetime import datetime
import random
import csv
import math
from pathlib import Path
import os
from twilio.rest import Client

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

    # Send Real SMS via Twilio
    if emergency_contact:
        twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        twilio_auth = os.getenv("TWILIO_AUTH_TOKEN")
        twilio_phone = os.getenv("TWILIO_PHONE_NUMBER")
        
        if twilio_sid and twilio_auth and twilio_phone:
            try:
                client = Client(twilio_sid, twilio_auth)
                sms_body = f"URGENT: {user_name} triggered an SOS! Message: {message}. Live Location: https://maps.google.com/?q={lat},{lng}"
                msg = client.messages.create(
                    body=sms_body,
                    from_=twilio_phone,
                    to=emergency_contact
                )
                print(f"[TWILIO] Sent SOS SMS to {emergency_contact}. SID: {msg.sid}")
            except Exception as e:
                print(f"[TWILIO ERROR] Failed to send SOS SMS: {e}")

    return alert

def send_risk_warning_sms(user_name: str, emergency_contact: str, lat: float, lng: float) -> bool:
    if not emergency_contact:
        return False
        
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_auth = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_phone = os.getenv("TWILIO_PHONE_NUMBER")
    
    if not (twilio_sid and twilio_auth and twilio_phone):
        print("[TWILIO ERROR] Missing Twilio credentials in environment.")
        return False
        
    try:
        client = Client(twilio_sid, twilio_auth)
        sms_body = f"SafeHer Alert: {user_name} has just entered a High-Risk Zone. They are currently at: https://maps.google.com/?q={lat},{lng}"
        msg = client.messages.create(
            body=sms_body,
            from_=twilio_phone,
            to=emergency_contact
        )
        print(f"[TWILIO] Sent High-Risk Warning SMS to {emergency_contact}. SID: {msg.sid}")
        return True
    except Exception as e:
        print(f"[TWILIO ERROR] Failed to send High-Risk Warning SMS: {e}")
        return False

def send_battery_warning_sms(user_name: str, emergency_contact: str, lat: float, lng: float, battery_level: int) -> bool:
    if not emergency_contact:
        return False
        
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_auth = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_phone = os.getenv("TWILIO_PHONE_NUMBER")
    
    if not (twilio_sid and twilio_auth and twilio_phone):
        print("[TWILIO ERROR] Missing Twilio credentials in environment.")
        return False
        
    try:
        client = Client(twilio_sid, twilio_auth)
        sms_body = f"SafeHer Alert: {user_name}'s phone battery is critically low ({battery_level}%). Last known location: https://maps.google.com/?q={lat},{lng}"
        msg = client.messages.create(
            body=sms_body,
            from_=twilio_phone,
            to=emergency_contact
        )
        print(f"[TWILIO] Sent Low Battery Warning SMS to {emergency_contact}. SID: {msg.sid}")
        return True
    except Exception as e:
        print(f"[TWILIO ERROR] Failed to send Low Battery Warning SMS: {e}")
        return False

def get_sos_log() -> list:
    return SOS_LOG
