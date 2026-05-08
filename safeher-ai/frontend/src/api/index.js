const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = async (path, method = "GET", body = null) => {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

export const getHeatmap = (center_lat, center_lng, hour, day_of_week) =>
  api("/api/heatmap", "POST", { center_lat, center_lng, hour, day_of_week });

export const getHotspots = () => api("/api/hotspots");

export const scoreRoute = (waypoints, hour, day_of_week) =>
  api("/api/route/score", "POST", { waypoints, hour, day_of_week });

export const getLightingMap = (center_lat, center_lng, hour) =>
  api("/api/lighting/map", "POST", { center_lat, center_lng, hour });

export const getLightingSavings = (num_zones = 100) =>
  api(`/api/lighting/savings?num_zones=${num_zones}`);

export const triggerSOS = (lat, lng, user_name, message, emergency_contact, medical_details) =>
  api("/api/sos/trigger", "POST", { lat, lng, user_name, message, emergency_contact, medical_details });

export const getSOSLog = () => api("/api/sos/log");

export const getNearestStation = (lat, lng) =>
  api(`/api/sos/nearest-station?lat=${lat}&lng=${lng}`);
export const findSafeRoute = (waypoints, hour, day_of_week) =>
  api("/api/route/find-safe", "POST", { waypoints, hour, day_of_week });
