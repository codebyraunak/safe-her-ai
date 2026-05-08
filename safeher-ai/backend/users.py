from datetime import datetime
import math

USERS = []

# ── Haversine distance for proximity calculations ───────────────────────────

def haversine_dist(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def register_user(user_id: str, name: str, emergency_contact: str, medical_details: str, lat: float, lng: float) -> dict:
    now = datetime.now().isoformat()
    existing = next((u for u in USERS if u["user_id"] == user_id), None)
    if existing:
        existing.update({
            "name": name,
            "emergency_contact": emergency_contact,
            "medical_details": medical_details,
            "lat": lat,
            "lng": lng,
            "last_seen": now,
            "active": True,
        })
        return existing

    user = {
        "user_id": user_id,
        "name": name,
        "emergency_contact": emergency_contact,
        "medical_details": medical_details,
        "lat": lat,
        "lng": lng,
        "last_seen": now,
        "active": True,
    }
    USERS.append(user)
    return user


def find_nearest_user(lat: float, lng: float, exclude_user_id: str = None, max_km: float = 10.0) -> dict:
    candidates = [u for u in USERS if u.get("active") and u["user_id"] != exclude_user_id]
    if not candidates:
        return None

    best = None
    for user in candidates:
        distance = haversine_dist(lat, lng, user["lat"], user["lng"])
        if distance <= max_km and (best is None or distance < best["distance_km"]):
            best = {**user, "distance_km": round(distance, 2)}
    return best


def get_active_users() -> list:
    return [u for u in USERS if u.get("active")]
