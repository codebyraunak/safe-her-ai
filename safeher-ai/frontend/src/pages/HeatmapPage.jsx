import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import { getHeatmap, getHotspots, getNearestHelper } from "../api";
import "leaflet/dist/leaflet.css";

const RISK_COLORS = {
  1: "#22c55e",  // Very Low - green
  2: "#84cc16",  // Low - lime
  3: "#f59e0b",  // Moderate - amber
  4: "#f97316",  // High - orange
  5: "#ef4444",  // Critical - red
};

const RISK_OPACITY = { 1: 0.25, 2: 0.3, 3: 0.4, 4: 0.5, 5: 0.6 };

// Bengaluru center
const DEFAULT_CENTER = [12.9716, 77.5946];

export default function HeatmapPage({ userInfo }) {
  const [points,   setPoints]   = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [hour,     setHour]     = useState(new Date().getHours());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [currentPos, setCurrentPos] = useState(null);
  const [nearestHelper, setNearestHelper] = useState(null);
  const [homeSaved, setHomeSaved] = useState(false);

  const fetchHeatmap = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [hm, hs] = await Promise.all([
        getHeatmap(DEFAULT_CENTER[0], DEFAULT_CENTER[1], hour, new Date().getDay()),
        getHotspots(),
      ]);
      setPoints(hm.points || []);
      setHotspots(hs.clusters || []);
    } catch (e) {
      setError("Could not load heatmap. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [hour]);

  useEffect(() => { fetchHeatmap(); }, [fetchHeatmap]);

  useEffect(() => {
    setHomeSaved(Boolean(localStorage.getItem("safeher_home_location")));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentPos([pos.coords.latitude, pos.coords.longitude]),
        () => {},
      );
    }
  }, []);

  useEffect(() => {
    if (!currentPos) return;
    getNearestHelper(currentPos[0], currentPos[1], userInfo?.user_id)
      .then((data) => setNearestHelper(data.nearest_helper || null))
      .catch(() => setNearestHelper(null));
  }, [currentPos, userInfo]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Safety Heatmap</h1>
          <p className="text-sm text-slate-400">AI-predicted risk zones for women — updated in real time</p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.4fr_0.9fr] items-center rounded-3xl border border-slate-700/80 bg-slate-900/70 p-4 shadow-xl shadow-slate-950/30">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400 uppercase tracking-[0.18em]">Time of day</p>
                <p className="text-lg font-semibold text-white">Choose a risk window</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-slate-800 px-3 py-2 text-sm font-semibold text-white border border-slate-700">
                  {String(hour).padStart(2, "0")}:00
                </div>
                <div className="rounded-full bg-slate-800/80 px-3 py-2 text-sm text-slate-300 border border-slate-700">
                  Current time: {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Early</span>
                <span>Late</span>
              </div>
              <div className="relative flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={23}
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  className="h-2 w-full appearance-none rounded-full bg-white/10 accent-pink-500 outline-none transition duration-200 hover:bg-white/20"
                />
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none bg-gradient-to-r from-pink-500/20 via-transparent to-slate-400/10 rounded-full h-2" />
              </div>
              <p className="text-xs text-slate-500">Slide to preview risk levels at different hours of the day.</p>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3 rounded-3xl border border-slate-700/80 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-400">Current risk window</span>
              <span className="rounded-full bg-pink-500/15 px-3 py-1 text-sm font-semibold text-pink-300">{hour < 6 ? "Night" : hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening"}</span>
            </div>
            <div className="rounded-3xl bg-slate-900/80 p-4 border border-slate-700 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-[0.16em]">Selected hour</p>
              <p className="text-3xl font-bold text-white mt-2">{String(hour).padStart(2, "0")}:00</p>
            </div>
            <button
              onClick={fetchHeatmap}
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 transition hover:from-pink-500 hover:to-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh map"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-900/40 border border-red-500/40 text-red-300 text-sm">{error}</div>
      )}

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {[["Very Low","#22c55e"],["Low","#84cc16"],["Moderate","#f59e0b"],["High","#f97316"],["Critical","#ef4444"]].map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-4">
          <div className="w-3 h-3 rounded-full border-2 border-pink-400" />
          <span className="text-xs text-slate-400">DBSCAN Hotspot</span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-700 min-h-[420px]">
        <MapContainer center={DEFAULT_CENTER} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CartoDB'
          />
          {points.map((pt, i) => (
            <Circle
              key={i}
              center={[pt.lat, pt.lng]}
              radius={250}
              pathOptions={{
                color: RISK_COLORS[pt.risk] || "#94a3b8",
                fillColor: RISK_COLORS[pt.risk] || "#94a3b8",
                fillOpacity: RISK_OPACITY[pt.risk] || 0.3,
                weight: 0,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>Risk Level:</strong> {pt.label}<br />
                  <strong>Score:</strong> {pt.risk}/5<br />
                  <strong>Coords:</strong> {pt.lat}, {pt.lng}
                </div>
              </Popup>
            </Circle>
          ))}
          {hotspots.map((hs) => (
            <Circle
              key={hs.cluster_id}
              center={[hs.center_lat, hs.center_lng]}
              radius={400}
              pathOptions={{ color: "#f472b6", fillColor: "#f472b6", fillOpacity: 0.15, weight: 2, dashArray: "6" }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>🔴 DBSCAN Hotspot</strong><br />
                  Incidents: {hs.incident_count}<br />
                  Avg Risk: {hs.avg_risk?.toFixed(1)}/5<br />
                  Type: {hs.dominant_type}
                </div>
              </Popup>
            </Circle>
          ))}
        </MapContainer>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Zones", value: points.length, color: "text-pink-400" },
          { label: "High Risk Zones", value: points.filter(p => p.risk >= 4).length, color: "text-red-400" },
          { label: "DBSCAN Hotspots", value: hotspots.length, color: "text-amber-400" },
          { label: "Smart Check", value: homeSaved ? "Ready" : "Setup required", color: homeSaved ? "text-emerald-400" : "text-slate-400" },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400">Nearest helper</p>
          <p className="text-2xl font-bold text-white mt-2">
            {nearestHelper ? `${nearestHelper.name} (${nearestHelper.distance_km} km)` : "No helper nearby"}
          </p>
          <p className="text-xs text-slate-500 mt-2">This app will try to route your emergency to the closest other user available.</p>
        </div>
      </div>
    </div>
  );
}
