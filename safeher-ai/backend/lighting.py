import random
from datetime import datetime

# ── Simulate traffic density per zone ────────────────────────────────────────
# In production: replace with TomTom / Google Maps traffic API

def get_traffic_density(lat: float, lng: float, hour: int = None) -> dict:
    if hour is None:
        hour = datetime.now().hour

    # Simulate density based on time of day
    if 7 <= hour <= 9 or 17 <= hour <= 20:
        base_density = random.uniform(0.7, 1.0)   # Peak hours
    elif 10 <= hour <= 16:
        base_density = random.uniform(0.4, 0.7)   # Daytime
    elif 21 <= hour <= 23:
        base_density = random.uniform(0.2, 0.5)   # Evening
    else:
        base_density = random.uniform(0.05, 0.2)  # Late night

    # Add slight randomness per coordinate
    noise = random.uniform(-0.05, 0.05)
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

# ── Compute brightness from density ──────────────────────────────────────────
def compute_brightness(density: float, is_emergency: bool = False) -> dict:
    if is_emergency:
        return {
            "brightness_pct": 120,
            "mode": "Emergency",
            "mode_desc": "Emergency vehicle detected — maximum brightness + blue flash",
            "energy_saved_pct": 0,
        }

    if density >= 0.75:
        brightness = 100
        mode = "Full"
        desc = "High pedestrian/vehicle density — full brightness for safety"
    elif density >= 0.45:
        brightness = 70
        mode = "Active"
        desc = "Moderate traffic — lights at 70% for balanced safety and efficiency"
    elif density >= 0.2:
        brightness = 40
        mode = "Dim"
        desc = "Low traffic — dimmed to conserve energy while maintaining visibility"
    else:
        brightness = 20
        mode = "Moonlight"
        desc = "Empty road — minimal lighting, maximum energy saving"

    energy_saved = round((1 - brightness / 100) * 100, 1)

    return {
        "brightness_pct": brightness,
        "mode": mode,
        "mode_desc": desc,
        "energy_saved_pct": energy_saved,
    }

# ── Get lighting status for a zone ───────────────────────────────────────────
def get_zone_lighting(lat: float, lng: float, hour: int = None, is_emergency: bool = False) -> dict:
    traffic = get_traffic_density(lat, lng, hour)
    brightness = compute_brightness(traffic["density"], is_emergency)

    return {
        "lat": lat,
        "lng": lng,
        "hour": traffic["hour"],
        "traffic_density": traffic["density"],
        "density_label": traffic["density_label"],
        **brightness,
    }

# ── Generate lighting map for area ───────────────────────────────────────────
def generate_lighting_map(center_lat: float, center_lng: float, hour: int = None) -> list:
    import numpy as np

    if hour is None:
        hour = datetime.now().hour

    zones = []
    for dlat in [x / 1000 for x in range(-15, 16, 5)]:
        for dlng in [x / 1000 for x in range(-15, 16, 5)]:
            lat = round(center_lat + dlat, 5)
            lng = round(center_lng + dlng, 5)
            zone = get_zone_lighting(lat, lng, hour)
            zones.append(zone)
    return zones

# ── Calculate energy savings for a city ──────────────────────────────────────
def calculate_city_savings(num_zones: int = 100, hour: int = None) -> dict:
    if hour is None:
        hour = datetime.now().hour

    total_traditional = num_zones * 100   # All lights at 100%
    total_smart = 0
    zone_breakdown = {"Emergency": 0, "Full": 0, "Active": 0, "Dim": 0, "Moonlight": 0}

    for _ in range(num_zones):
        density = random.uniform(0, 1)
        brightness = compute_brightness(density)
        total_smart += brightness["brightness_pct"]
        zone_breakdown[brightness["mode"]] = zone_breakdown.get(brightness["mode"], 0) + 1

    savings_pct = round((1 - total_smart / total_traditional) * 100, 1)

    return {
        "total_zones": num_zones,
        "traditional_energy_units": total_traditional,
        "smart_energy_units": round(total_smart, 1),
        "energy_saved_pct": savings_pct,
        "zone_breakdown": zone_breakdown,
        "hour": hour,
    }
