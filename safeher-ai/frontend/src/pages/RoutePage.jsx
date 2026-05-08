import { useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from "react-leaflet";
import { scoreRoute, findSafeRoute } from "../api";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [12.9716, 77.5946];

const PRESET_LOCATIONS = [
  { name: "Koramangala", lat: 12.9352, lng: 77.6245 },
  { name: "MG Road", lat: 12.9758, lng: 77.6065 },
  { name: "Indiranagar", lat: 12.9784, lng: 77.6408 },
  { name: "Jayanagar", lat: 12.9300, lng: 77.5832 },
  { name: "Whitefield", lat: 12.9698, lng: 77.7500 },
  { name: "Electronic City", lat: 12.8399, lng: 77.6770 },
  { name: "Hebbal", lat: 13.0358, lng: 77.5970 },
  { name: "BTM Layout", lat: 12.9166, lng: 77.6101 },
];

const SCORE_COLOR = (score) => {
  if (score >= 80) return { text: "text-green-400", bg: "bg-green-900/30", border: "border-green-500/40", line: "#22c55e" };
  if (score >= 60) return { text: "text-amber-400", bg: "bg-amber-900/30", border: "border-amber-500/40", line: "#f59e0b" };
  if (score >= 40) return { text: "text-orange-400", bg: "bg-orange-900/30", border: "border-orange-500/40", line: "#f97316" };
  return { text: "text-red-400", bg: "bg-red-900/30", border: "border-red-500/40", line: "#ef4444" };
};

function FitBounds({ routes }) {
  const map = useMap();
  if (routes?.length > 0 && routes[0].coordinates?.length > 0) {
    const allCoords = routes.flatMap(r => r.coordinates);
    const lats = allCoords.map(c => c[0]);
    const lngs = allCoords.map(c => c[1]);
    map.fitBounds([
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ], { padding: [40, 40] });
  }
  return null;
}

export default function RoutePage() {
  const [startIdx, setStartIdx] = useState(0);
  const [endIdx, setEndIdx] = useState(1);
  const [hour, setHour] = useState(new Date().getHours());
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRoute, setSelectedRoute] = useState(0);

  const start = PRESET_LOCATIONS[startIdx];
  const end = PRESET_LOCATIONS[endIdx];

  const handleFind = async () => {
    if (startIdx === endIdx) {
      setError("Start and end must be different locations.");
      return;
    }
    setLoading(true);
    setError("");
    setRoutes([]);
    try {
      const data = await findSafeRoute(
        [{ lat: start.lat, lng: start.lng }, { lat: end.lat, lng: end.lng }],
        hour,
        new Date().getDay()
      );
      if (data.routes?.length === 0) throw new Error("No routes found");

      const unique = data.routes.filter((r, i, arr) =>
        i === 0 || Math.abs(r.distance_m - arr[i - 1].distance_m) > 500
      );

      setRoutes(unique);
      setSelectedRoute(0);
    } catch {
      setError("OpenRouteService unavailable — showing direct route score instead.");
      try {
        const waypoints = [
          { lat: start.lat, lng: start.lng },
          { lat: (start.lat + end.lat) / 2, lng: (start.lng + end.lng) / 2 },
          { lat: end.lat, lng: end.lng },
        ];
        const scored = await scoreRoute(waypoints, hour, new Date().getDay());
        setRoutes([{
          route_index: 0,
          coordinates: waypoints.map(w => [w.lat, w.lng]),
          score: scored.score,
          label: scored.label,
          avg_risk: scored.avg_risk,
          is_safest: true,
          distance_m: null,
          duration_s: null,
        }]);
        setSelectedRoute(0);
      } catch {
        setError("Could not reach backend. Is it running?");
      }
    } finally {
      setLoading(false);
    }
  };

  const safest = routes.find(r => r.is_safest) || routes[0];

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h1 className="text-2xl font-bold text-white">Safe Route Finder</h1>
        <p className="text-sm text-slate-400">Compare routes and find the safest path to your destination</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
          <label className="text-xs text-slate-400 block mb-2">📍 Start</label>
          <select
            value={startIdx}
            onChange={e => { setStartIdx(Number(e.target.value)); setRoutes([]); }}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:border-pink-500"
          >
            {PRESET_LOCATIONS.map((l, i) => (
              <option key={i} value={i}>{l.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
          <label className="text-xs text-slate-400 block mb-2">🏁 End</label>
          <select
            value={endIdx}
            onChange={e => { setEndIdx(Number(e.target.value)); setRoutes([]); }}
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:border-pink-500"
          >
            {PRESET_LOCATIONS.map((l, i) => (
              <option key={i} value={i}>{l.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
          <label className="text-xs text-slate-400 block mb-2">
            🕐 Time: <span className="text-white font-mono">{String(hour).padStart(2, "0")}:00</span>
          </label>
          <input
            type="range" min={0} max={23} value={hour}
            onChange={e => setHour(Number(e.target.value))}
            className="w-full accent-pink-500"
          />
        </div>

        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 flex items-end">
          <button
            onClick={handleFind}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-semibold text-sm disabled:opacity-50 transition"
          >
            {loading ? "Finding Routes…" : "Find Safe Route"}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-yellow-900/40 border border-yellow-500/40 text-yellow-300 text-sm">{error}</div>
      )}

      {routes.length > 0 && (
        <div className={`grid grid-cols-1 gap-3 ${routes.length === 1 ? "md:grid-cols-1" : routes.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
          {routes.map((route, i) => {
            const c = SCORE_COLOR(route.score);
            const isSelected = selectedRoute === i;
            return (
              <div
                key={i}
                onClick={() => setSelectedRoute(i)}
                className={`rounded-xl p-4 border cursor-pointer transition-all ${c.bg} ${isSelected ? c.border + " ring-2 ring-pink-500" : "border-slate-700"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium">
                    Route {i + 1} {route.is_safest ? "⭐ Safest" : ""}
                  </span>
                  <span className={`text-2xl font-bold ${c.text}`}>{route.score}</span>
                </div>
                <p className={`text-sm font-semibold ${c.text}`}>{route.label}</p>
                <p className="text-xs text-slate-400 mt-1">Avg Risk: {route.avg_risk}/5</p>
                {route.distance_m && (
                  <p className="text-xs text-slate-400">
                    {(route.distance_m / 1000).toFixed(1)} km · {Math.round(route.duration_s / 60)} min
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {safest && (
        <div className={`rounded-xl p-4 border flex items-center gap-4 ${SCORE_COLOR(safest.score).bg} ${SCORE_COLOR(safest.score).border}`}>
          <div className="text-3xl">🛡️</div>
          <div>
            <p className="text-white font-semibold">
              Recommended: Route {routes.indexOf(safest) + 1} — {start.name} → {end.name}
            </p>
            <p className={`text-sm ${SCORE_COLOR(safest.score).text}`}>
              Safety Score: {safest.score}/100 · {safest.label}
              {safest.distance_m ? ` · ${(safest.distance_m / 1000).toFixed(1)} km` : ""}
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-700 min-h-[360px]">
        <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CartoDB'
          />
          {routes.length > 0 && <FitBounds routes={routes} />}

          {routes.map((route, i) => {
            const isSelected = selectedRoute === i;
            const isSafest = route.is_safest;
            return (
              <Polyline
                key={i}
                positions={route.coordinates}
                pathOptions={{
                  color: isSafest ? "#22c55e" : SCORE_COLOR(route.score).line,
                  weight: isSelected ? 6 : 3,
                  opacity: isSelected ? 1 : 0.4,
                  dashArray: isSafest ? null : "6 4",
                }}
                eventHandlers={{ click: () => setSelectedRoute(i) }}
              />
            );
          })}

          <CircleMarker center={[start.lat, start.lng]} radius={10}
            pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 1 }}>
            <Popup><strong>Start:</strong> {start.name}</Popup>
          </CircleMarker>

          <CircleMarker center={[end.lat, end.lng]} radius={10}
            pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 1 }}>
            <Popup><strong>End:</strong> {end.name}</Popup>
          </CircleMarker>
        </MapContainer>
      </div>

      <p className="text-xs text-slate-500 text-center">
        Green = safest route · Solid = selected · Dashed = alternatives · Click a route on map to highlight
      </p>
    </div>
  );
}