import { useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from "react-leaflet";
import { scoreRoute } from "../api";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [12.9716, 77.5946];

// Sample preset routes around Bengaluru
const PRESET_ROUTES = [
  {
    name: "Koramangala → MG Road",
    waypoints: [
      { lat: 12.9352, lng: 77.6245 },
      { lat: 12.9500, lng: 77.6150 },
      { lat: 12.9650, lng: 77.6100 },
      { lat: 12.9758, lng: 77.6065 },
    ],
  },
  {
    name: "Indiranagar → Jayanagar",
    waypoints: [
      { lat: 12.9784, lng: 77.6408 },
      { lat: 12.9600, lng: 77.6200 },
      { lat: 12.9400, lng: 77.6000 },
      { lat: 12.9300, lng: 77.5832 },
    ],
  },
  {
    name: "Whitefield → MG Road",
    waypoints: [
      { lat: 12.9698, lng: 77.7500 },
      { lat: 12.9716, lng: 77.7000 },
      { lat: 12.9730, lng: 77.6500 },
      { lat: 12.9758, lng: 77.6065 },
    ],
  },
];

const SCORE_COLOR = (score) => {
  if (score >= 80) return { text: "text-green-400",  bg: "bg-green-900/30",  border: "border-green-500/40" };
  if (score >= 60) return { text: "text-amber-400",  bg: "bg-amber-900/30",  border: "border-amber-500/40" };
  if (score >= 40) return { text: "text-orange-400", bg: "bg-orange-900/30", border: "border-orange-500/40" };
  return              { text: "text-red-400",    bg: "bg-red-900/30",    border: "border-red-500/40" };
};

const RISK_COLORS = ["#22c55e","#84cc16","#f59e0b","#f97316","#ef4444"];

export default function RoutePage() {
  const [selected, setSelected] = useState(0);
  const [hour,     setHour]     = useState(new Date().getHours());
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleScore = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const route = PRESET_ROUTES[selected];
      const data  = await scoreRoute(route.waypoints, hour, new Date().getDay());
      setResult({ ...data, route });
    } catch {
      setError("Could not score route. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const colors = result ? SCORE_COLOR(result.score) : null;
  const routeCoords = result
    ? result.route.waypoints.map(w => [w.lat, w.lng])
    : PRESET_ROUTES[selected].waypoints.map(w => [w.lat, w.lng]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h1 className="text-2xl font-bold text-white">Safe Route Scorer</h1>
        <p className="text-sm text-slate-400">Get a safety score for your route before you travel</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
          <label className="text-xs text-slate-400 block mb-2">Select Route</label>
          <select
            value={selected}
            onChange={e => { setSelected(Number(e.target.value)); setResult(null); }}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:border-pink-500"
          >
            {PRESET_ROUTES.map((r, i) => (
              <option key={i} value={i}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
          <label className="text-xs text-slate-400 block mb-2">
            Time of Travel: <span className="text-white font-mono">{String(hour).padStart(2,"0")}:00</span>
          </label>
          <input
            type="range" min={0} max={23} value={hour}
            onChange={e => setHour(Number(e.target.value))}
            className="w-full accent-pink-500"
          />
        </div>

        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 flex items-end">
          <button
            onClick={handleScore}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-semibold text-sm disabled:opacity-50 transition"
          >
            {loading ? "Scoring…" : "Score This Route"}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-900/40 border border-red-500/40 text-red-300 text-sm">{error}</div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-xl p-5 border ${colors.bg} ${colors.border} flex flex-wrap items-center gap-6`}>
          <div className="text-center">
            <p className={`text-5xl font-bold ${colors.text}`}>{result.score}</p>
            <p className="text-xs text-slate-400 mt-1">Safety Score / 100</p>
          </div>
          <div>
            <p className={`text-xl font-semibold ${colors.text}`}>{result.label}</p>
            <p className="text-sm text-slate-400">Route: {result.route.name}</p>
            <p className="text-sm text-slate-400">Avg Zone Risk: {result.avg_risk}/5 · Time: {String(hour).padStart(2,"0")}:00</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(result.zone_breakdown || []).map((r, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RISK_COLORS[r - 1] }} />
                <span className="text-xs text-slate-400">Zone {i+1}: {r}/5</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-700 min-h-[360px]">
        <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CartoDB'
          />
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: result ? (result.score >= 60 ? "#22c55e" : "#ef4444") : "#f472b6", weight: 5, opacity: 0.8 }}
          />
          {routeCoords.map((pos, i) => (
            <CircleMarker key={i} center={pos} radius={8}
              pathOptions={{ color: "#f472b6", fillColor: "#f472b6", fillOpacity: 1 }}>
              <Popup>
                <span className="text-sm">
                  Waypoint {i + 1}<br />
                  {result?.zone_breakdown?.[i] ? `Risk: ${result.zone_breakdown[i]}/5` : ""}
                </span>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
