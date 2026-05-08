import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import { getLightingMap, getLightingSavings } from "../api";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [12.9716, 77.5946];

const STATUS_COLORS = {
  Working:        "#22c55e",
  "Not Working": "#ef4444",
  "No Street Light": "#6b7280",
};

const getStatusColor = (zone) => {
  if (!zone.has_street_light) return STATUS_COLORS["No Street Light"];
  if (!zone.is_working) return STATUS_COLORS["Not Working"];
  return STATUS_COLORS.Working;
};

export default function LightingPage() {
  const [zones,    setZones]    = useState([]);
  const [savings,  setSavings]  = useState(null);
  const [hour,     setHour]     = useState(new Date().getHours());
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [lm, sv] = await Promise.all([
        getLightingMap(DEFAULT_CENTER[0], DEFAULT_CENTER[1], hour),
        getLightingSavings(49),
      ]);
      setZones(lm.zones || []);
      setSavings(sv);
    } catch {
      setError("Could not load lighting data. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Smart Street Lighting</h1>
          <p className="text-sm text-slate-400">Street light operational status — showing working, broken, and missing lights.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">Hour:</label>
          <input
            type="range" min={0} max={23} value={hour}
            onChange={e => setHour(Number(e.target.value))}
            className="w-28 accent-amber-400"
          />
          <span className="text-white font-mono text-sm w-14">{String(hour).padStart(2,"0")}:00</span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm disabled:opacity-50 transition"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-900/40 border border-red-500/40 text-red-300 text-sm">{error}</div>
      )}

      {/* Status legend */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-slate-400">{status}</span>
          </div>
        ))}
      </div>

      {/* Street light status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Working Lights",     value: savings?.working_count ?? "—",      color: "text-emerald-400" },
          { label: "Broken Lights",      value: savings?.not_working_count ?? "—",  color: "text-red-400" },
          { label: "No Street Lights",   value: savings?.no_light_count ?? "—",   color: "text-slate-400" },
          { label: "Total Zones",        value: savings?.total_zones ?? "—",       color: "text-white" },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-700 min-h-[380px]">
        <MapContainer center={DEFAULT_CENTER} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CartoDB'
          />
          {zones.map((z, i) => (
            <Circle
              key={i}
              center={[z.lat, z.lng]}
              radius={180}
              pathOptions={{
                color: getStatusColor(z),
                fillColor: getStatusColor(z),
                fillOpacity: 0.35,
                weight: 0,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>Street Light:</strong> {z.has_street_light ? "Yes" : "No"}<br />
                  <strong>Status:</strong> {z.has_street_light ? (z.is_working ? "Working" : "Broken") : "No Street Light"}<br />
                  <strong>Brightness:</strong> {z.brightness_pct}%<br />
                  <strong>Traffic:</strong> {z.density_label} ({(z.traffic_density * 100).toFixed(0)}%)<br />
                  <em className="text-xs">{z.mode_desc}</em>
                </div>
              </Popup>
            </Circle>
          ))}
        </MapContainer>
      </div>

      {/* Saving breakdown */}
      {savings && (
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
          <p className="text-sm font-semibold text-white mb-3">City-wide Street Light Status ({savings.total_zones} zones)</p>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(savings.status_breakdown).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className="w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold text-black"
                  style={{ backgroundColor: STATUS_COLORS[status] }}>
                  {count}
                </div>
                <p className="text-xs text-slate-400">{status}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
