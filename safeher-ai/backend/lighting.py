import random
from datetime import datetime

# ── Traffic density simulation ────────────────────────────────────────────────
# In production: replace with TomTom / Google Maps traffic API

def get_traffic_density(lat: float, lng: float, hour: int = None) -> dict:
    if hour is None:
        hour = datetime.now().hour

    if 7 <= hour <= 9 or 17 <= hour <= 20:
        base_density = random.uniform(0.7, 1.0)
    elif 10 <= hour <= 16:
        base_density = random.uniform(0.4, 0.7)
    elif 21 <= hour <= 23:
        base_density = random.uniform(0.2, 0.5)
    else:
        base_density = random.uniform(0.05, 0.2)

    noise   = random.uniform(-0.05, 0.05)
    density = max(0.0, min(1.0, base_density + noise))

    return {
        "lat": lat,
        "lng": lng,
        "hour": hour,
        "density": round(density, 3),
        "density_label": classify_density(density),
    }

def classify_density(density: float) -> str:
    if density >= 0.75:
        return "High"
    elif density >= 0.45:
        return "Medium"
    elif density >= 0.2:
        return "Low"
    else:
        return "Empty"

# ── Street-light availability (deterministic per coordinate) ──────────────────

def simulate_street_light_status(lat: float, lng: float) -> dict:
    seed = int((round(lat * 1000) * 31 + round(lng * 1000) * 17) % 100)
    has_street_light = seed % 10 != 0
    is_working       = has_street_light and (seed % 7 != 0)
    return {
        "has_street_light": has_street_light,
        "is_working": is_working,
    }

# ── Brightness from density ───────────────────────────────────────────────────

def compute_brightness(density: float, is_emergency: bool = False) -> dict:
    if is_emergency:
        return {
            "brightness_pct": 100,          # FIX: Cap at 100 — 120% is physically meaningless
            "mode": "Emergency",
            "mode_desc": "Emergency detected — full brightness",
            "energy_saved_pct": 0,
        }

    if density >= 0.75:
        brightness, mode, desc = 100, "Full", "High density — full brightness for safety"
    elif density >= 0.45:
        brightness, mode, desc = 70, "Active", "Moderate traffic — 70% brightness"
    elif density >= 0.2:
        brightness, mode, desc = 40, "Dim", "Low traffic — dimmed to conserve energy"
    else:
        brightness, mode, desc = 20, "Moonlight", "Empty road — minimal lighting"

    energy_saved = round((1 - brightness / 100) * 100, 1)

    return {
        "brightness_pct": brightness,
        "mode": mode,
        "mode_desc": desc,
        "energy_saved_pct": energy_saved,
    }

# ── Zone lighting status ──────────────────────────────────────────────────────

def get_zone_lighting(lat: float, lng: float, hour: int = None, is_emergency: bool = False) -> dict:
    traffic    = get_traffic_density(lat, lng, hour)
    status     = simulate_street_light_status(lat, lng)
    brightness = compute_brightness(traffic["density"], is_emergency)

    if not status["has_street_light"]:
        brightness = {
            "brightness_pct": 0,
            "mode": "No Light",
            "mode_desc": "No street light installed in this zone.",
            "energy_saved_pct": 0,
        }
    elif not status["is_working"]:
        brightness = {
            "brightness_pct": 0,
            "mode": "Broken",
            "mode_desc": "Street light exists but is not working.",
            "energy_saved_pct": 0,
        }

    return {
        "lat": lat,
        "lng": lng,
        "hour": traffic["hour"],
        "traffic_density": traffic["density"],
        "density_label": traffic["density_label"],
        **status,
        **brightness,
    }

# ── Lighting map for an area ──────────────────────────────────────────────────

def generate_lighting_map(center_lat: float, center_lng: float, hour: int = None) -> list:
    # FIX: Removed unused `import numpy as np` inside the function
    if hour is None:
        hour = datetime.now().hour

    zones = []
    for dlat in [x / 1000 for x in range(-15, 16, 5)]:
        for dlng in [x / 1000 for x in range(-15, 16, 5)]:
            lat  = round(center_lat + dlat, 5)
            lng  = round(center_lng + dlng, 5)
            zone = get_zone_lighting(lat, lng, hour)
            zones.append(zone)
    return zones

# ── City-wide energy savings estimate ────────────────────────────────────────

def calculate_city_savings(num_zones: int = 100, hour: int = None) -> dict:
    if hour is None:
        hour = datetime.now().hour

    zone_breakdown   = {"Working": 0, "Not Working": 0, "No Street Light": 0}
    total_traditional = num_zones * 100
    total_smart       = 0

    for _ in range(num_zones):
        density = random.uniform(0, 1)
        lat     = random.uniform(12.73, 13.15)
        lng     = random.uniform(77.45, 77.80)
        status  = simulate_street_light_status(lat, lng)

        if not status["has_street_light"]:
            zone_breakdown["No Street Light"] += 1
        elif not status["is_working"]:
            zone_breakdown["Not Working"] += 1
        else:
            zone_breakdown["Working"] += 1
            brightness = compute_brightness(density)
            total_smart += brightness["brightness_pct"]

    # FIX: Only count working zones in the savings calculation for accuracy
    working = zone_breakdown["Working"]
    if working == 0 or total_traditional == 0:
        savings_pct = 0.0
    else:
        # Compare smart usage vs full traditional usage for working zones only
        traditional_working = working * 100
        savings_pct = round((1 - total_smart / traditional_working) * 100, 1)

    return {
        "total_zones": num_zones,
        "working_count": zone_breakdown["Working"],
        "not_working_count": zone_breakdown["Not Working"],
        "no_light_count": zone_breakdown["No Street Light"],
        "status_breakdown": zone_breakdown,
        "energy_saved_pct": savings_pct,
        "hour": hour,
    }
