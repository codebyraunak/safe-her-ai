import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Circle, Popup, Marker } from "react-leaflet";
import { getHeatmap, getHotspots } from "../api";
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

export default function HeatmapPage() {
  const [points,   setPoints]   = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [hour,     setHour]     = useState(new Date().getHours());
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

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

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Safety Heatmap</h1>
          <p className="text-sm text-slate-400">AI-predicted risk zones for women — updated in real time</p>
        </div>
       <div className="flex items-center gap-3">
         <label className="text-sm text-slate-400">Time of day:</label>
      <input
       type="range" min={0} max={23} value={hour}
      onChange={e => setHour(Number(e.target.value))}
       className="w-32 accent-pink-500"
        />
  <span className="text-white font-mono text-sm w-14">
    {String(hour).padStart(2, "0")}:00
  </span>
          <button
            onClick={fetchHeatmap}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-sm font-medium disabled:opacity-50 transition"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
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
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Zones", value: points.length, color: "text-pink-400" },
          { label: "High Risk Zones", value: points.filter(p => p.risk >= 4).length, color: "text-red-400" },
          { label: "DBSCAN Hotspots", value: hotspots.length, color: "text-amber-400" },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
