import { useEffect, useState, useCallback, useRef } from "react";
import {
  MapContainer, TileLayer, Circle, Popup,
  useMapEvents, CircleMarker, Polygon, useMap,
} from "react-leaflet";
import {
  getHeatmap, getHotspots, getNearestHelper,
  reportDangerPin, getDangerPins, getSafeSpots, getIncidentHistory,
} from "../api";
import "leaflet/dist/leaflet.css";

/* ── zoom-aware radius helper ── */
function getRadius(zoom) {
  // at zoom 14 → ~120m, at zoom 12 → ~400m, at zoom 16 → ~50m
  return Math.max(40, 120 * Math.pow(2, 14 - zoom));
}

/* ── re-renders circles when zoom changes ── */
function ZoomAwareCircles({ points }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() { setZoom(map.getZoom()); },
  });

  const radius = getRadius(zoom);

  return (
    <>
      {points.map((pt, i) => (
        <Circle
          key={i}
          center={[pt.lat, pt.lng]}
          radius={radius}
          pathOptions={{
            color: RISK_COLORS[pt.risk] || "#94a3b8",
            fillColor: RISK_COLORS[pt.risk] || "#94a3b8",
            fillOpacity: RISK_OPACITY[pt.risk] || 0.25,
            weight: 0,
          }}
        >
          <Popup>
            <div className="text-sm">
              <strong>Risk Level:</strong> {pt.label}<br />
              <strong>Score:</strong> {pt.risk}/5<br />
              <strong>Coords:</strong> {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
            </div>
          </Popup>
        </Circle>
      ))}
    </>
  );
}

/* ── hotspots only shown when zoomed out enough ── */
function ZoomAwareHotspots({ hotspots }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() { setZoom(map.getZoom()); },
  });

  if (zoom > 15) return null; // hide at very high zoom — individual points take over

  const radius = getRadius(zoom) * 2.5;

  return (
    <>
      {hotspots.map((hs) => (
        <Circle
          key={hs.cluster_id}
          center={[hs.center_lat, hs.center_lng]}
          radius={radius}
          pathOptions={{
            color: "#f472b6",
            fillColor: "#f472b6",
            fillOpacity: 0.08,
            weight: 1.5,
            dashArray: "6",
          }}
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
    </>
  );
}

function MapClickHandler({ onClick }) {
  useMapEvents({ click(e) { onClick(e.latlng); } });
  return null;
}

const RISK_COLORS = {
  1: "#22c55e",
  2: "#84cc16",
  3: "#f59e0b",
  4: "#f97316",
  5: "#ef4444",
};
const RISK_OPACITY = { 1: 0.2, 2: 0.25, 3: 0.35, 4: 0.45, 5: 0.55 };

const DEFAULT_CENTER = [12.9716, 77.5946];

const WORLD_BOUNDS = [[90, -180], [90, 180], [-90, 180], [-90, -180]];
const DATA_BOUNDS = [
  [DEFAULT_CENTER[0] - 0.08, DEFAULT_CENTER[1] - 0.08],
  [DEFAULT_CENTER[0] - 0.08, DEFAULT_CENTER[1] + 0.08],
  [DEFAULT_CENTER[0] + 0.08, DEFAULT_CENTER[1] + 0.08],
  [DEFAULT_CENTER[0] + 0.08, DEFAULT_CENTER[1] - 0.08],
];

export default function HeatmapPage({ userInfo }) {
  const [points,        setPoints]        = useState([]);
  const [hotspots,      setHotspots]      = useState([]);
  const [selectedHour,  setSelectedHour]  = useState(new Date().getHours());
  const [appliedHour,   setAppliedHour]   = useState(new Date().getHours());
  const [currentTime,   setCurrentTime]   = useState(new Date());
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [currentPos,    setCurrentPos]    = useState(null);
  const [nearestHelper, setNearestHelper] = useState(null);
  const [homeSaved,     setHomeSaved]     = useState(false);
  const [dangerPins,    setDangerPins]    = useState([]);
  const [reportModal,   setReportModal]   = useState({ open: false, lat: null, lng: null });
  const [reportType,    setReportType]    = useState("Harassment");
  const [reportDesc,    setReportDesc]    = useState("");
  const [showSafeSpots, setShowSafeSpots] = useState(false);
  const [safeSpots,     setSafeSpots]     = useState([]);
  const [incidents,     setIncidents]     = useState([]);
  const [showFeed,      setShowFeed]      = useState(false);

  const fetchHeatmap = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [hm, hs, dp, inc] = await Promise.all([
        getHeatmap(DEFAULT_CENTER[0], DEFAULT_CENTER[1], appliedHour, new Date().getDay()),
        getHotspots(),
        getDangerPins(),
        getIncidentHistory(),
      ]);
      setPoints(hm.points || []);
      setHotspots(hs.clusters || []);
      setDangerPins(dp || []);
      setIncidents(inc.incidents || []);
    } catch {
      setError("Could not load heatmap. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [appliedHour]);

  useEffect(() => { fetchHeatmap(); }, [fetchHeatmap]);
  useEffect(() => { setHomeSaved(Boolean(localStorage.getItem("safeher_home_location"))); }, []);

  const currentHour      = currentTime.getHours();
  const currentTimeLabel = currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const previewButtonLabel = selectedHour === appliedHour ? "Refresh current hour" : "Preview selected hour";

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
    if (currentHour !== appliedHour && appliedHour === selectedHour && currentHour !== selectedHour) {
      setSelectedHour(currentHour);
      setAppliedHour(currentHour);
    }
  }, [currentHour, appliedHour, selectedHour]);

  useEffect(() => {
    if (!currentPos) return;
    getNearestHelper(currentPos[0], currentPos[1], userInfo?.user_id)
      .then((data) => setNearestHelper(data.nearest_helper || null))
      .catch(() => setNearestHelper(null));
  }, [currentPos, userInfo]);

  const handleMapClick = (latlng) => {
    setReportModal({ open: true, lat: latlng.lat, lng: latlng.lng });
  };

  const submitDangerPin = async () => {
    try {
      await reportDangerPin(reportModal.lat, reportModal.lng, reportType, reportDesc);
      setReportModal({ open: false, lat: null, lng: null });
      setReportDesc("");
      fetchHeatmap();
    } catch {
      alert("Failed to report danger pin.");
    }
  };

  const handleToggleSafeSpots = async () => {
    const newVal = !showSafeSpots;
    setShowSafeSpots(newVal);
    if (newVal && safeSpots.length === 0) {
      setLoading(true);
      try {
        const res = await getSafeSpots(DEFAULT_CENTER[0], DEFAULT_CENTER[1], 4000);
        setSafeSpots(res.spots || []);
      } catch {
        alert("Failed to load safe spots");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Safety Heatmap</h1>
          <p className="text-sm text-slate-400">AI-predicted risk zones — updated in real time</p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.4fr_0.9fr] items-center rounded-3xl border border-slate-700/80 bg-slate-900/70 p-4 shadow-xl shadow-slate-950/30">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400 uppercase tracking-[0.18em]">Time of day</p>
                <p className="text-lg font-semibold text-white">Choose a risk window</p>
              </div>
              <div className="rounded-full bg-slate-800 px-3 py-2 text-sm font-semibold text-white border border-slate-700">
                Selected: {String(selectedHour).padStart(2, "0")}:00
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Early</span><span>Late</span>
              </div>
              <input
                type="range" min={0} max={23} value={selectedHour}
                onChange={(e) => setSelectedHour(Number(e.target.value))}
                className="h-2 w-full appearance-none rounded-full bg-white/10 accent-pink-500 outline-none transition duration-200 hover:bg-white/20"
              />
              <p className="text-xs text-slate-500">Current data is shown automatically; use the slider to preview a different hour.</p>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3 rounded-3xl border border-slate-700/80 bg-slate-950/60 p-4">
            <div className="rounded-3xl bg-slate-900/80 p-5 border border-slate-700 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-[0.16em]">Current time</p>
              <p className="text-4xl font-bold text-white mt-3">{currentTimeLabel}</p>
              <p className="text-xs text-slate-500 mt-3 uppercase tracking-[0.16em]">Displayed data hour</p>
              <p className="text-xl font-semibold text-pink-300 mt-1">
                {String(appliedHour).padStart(2, "0")}:00 {appliedHour === currentHour ? "(Live)" : "(Preview)"}
              </p>
            </div>
            <button
              onClick={() => setAppliedHour(selectedHour)}
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 transition hover:from-pink-500 hover:to-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading…" : previewButtonLabel}
            </button>
            <button
              onClick={handleToggleSafeSpots}
              disabled={loading}
              className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                showSafeSpots
                  ? "bg-slate-700 text-white border border-slate-600"
                  : "bg-gradient-to-r from-blue-600 to-blue-500 text-white border border-transparent hover:from-blue-500 hover:to-blue-400"
              }`}
            >
              {showSafeSpots ? "Hide Safe Spots" : "Show Safe Spots (Police/Hospital)"}
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
        <div className="flex items-center gap-1.5 ml-4">
          <div className="w-3 h-3 rounded-full bg-red-500 border border-white" />
          <span className="text-xs text-slate-400">Danger Pin</span>
        </div>
        <div className="flex items-center gap-1.5 ml-4">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-400">Safe Spot</span>
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1 rounded-2xl overflow-hidden border border-slate-700 min-h-[420px]">
        <MapContainer center={DEFAULT_CENTER} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CartoDB'
          />
          <Polygon
            positions={[WORLD_BOUNDS, DATA_BOUNDS]}
            pathOptions={{ color: "transparent", fillColor: "#0f172a", fillOpacity: 0.7 }}
          />
          <MapClickHandler onClick={handleMapClick} />

          {/* ✅ Zoom-aware risk circles — radius shrinks as you zoom in */}
          <ZoomAwareCircles points={points} />

          {/* ✅ Hotspots hidden at high zoom to reduce clutter */}
          <ZoomAwareHotspots hotspots={hotspots} />

          {dangerPins.map((pin, i) => (
            <CircleMarker
              key={`pin-${i}`}
              center={[pin.lat, pin.lng]}
              radius={6}
              pathOptions={{ color: "white", fillColor: "#ef4444", fillOpacity: 1, weight: 2 }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>🚨 Danger Pin</strong><br />
                  Type: {pin.type}<br />
                  {pin.description && <span>Desc: {pin.description}</span>}
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {showSafeSpots && safeSpots.map((spot, i) => {
            const color = spot.type === "hospital" ? "#22c55e" : spot.type === "24/7 shop" ? "#eab308" : "#3b82f6";
            return (
              <CircleMarker
                key={`spot-${i}`}
                center={[spot.lat, spot.lng]}
                radius={7}
                pathOptions={{ color: "white", fillColor: color, fillOpacity: 1, weight: 2 }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>🛡️ Safe Spot</strong><br />
                    Name: {spot.name}<br />
                    Type: {spot.type}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Live Activity Feed — now inside relative parent so positioning works */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col items-end">
          <button
            onClick={() => setShowFeed(!showFeed)}
            className="mb-2 rounded-xl bg-slate-900/90 border border-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-xl backdrop-blur-md hover:bg-slate-800 transition"
          >
            {showFeed ? "Hide Activity Feed" : "Live Activity Feed 🔔"}
          </button>
          {showFeed && (
            <div className="w-80 max-h-96 overflow-y-auto rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-xl p-4 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-1 sticky top-0 bg-slate-900/95 pb-2">
                Recent Reports
              </h3>
              {incidents.length === 0 ? (
                <p className="text-xs text-slate-500">No recent incidents.</p>
              ) : (
                incidents.map((inc) => (
                  <div key={inc.id} className="border-l-2 border-pink-500 pl-3 py-1">
                    <p className="text-xs text-pink-400 font-semibold">{inc.type}</p>
                    <p className="text-sm text-slate-300">{inc.area}</p>
                    <p className="text-xs text-slate-500 mt-1">{inc.relative_time}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Zones",      value: points.length,                          color: "text-pink-400" },
          { label: "High Risk Zones",  value: points.filter(p => p.risk >= 4).length, color: "text-red-400" },
          { label: "DBSCAN Hotspots",  value: hotspots.length,                        color: "text-amber-400" },
          { label: "Smart Check",      value: homeSaved ? "Ready" : "Setup required", color: homeSaved ? "text-emerald-400" : "text-slate-400" },
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
          <p className="text-xs text-slate-500 mt-2">Routes your emergency to the closest available user.</p>
        </div>
      </div>

      {/* Report Modal */}
      {reportModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Report Danger Here?</h2>
            <p className="text-sm text-slate-400 mb-4">
              {reportModal.lat.toFixed(4)}, {reportModal.lng.toFixed(4)}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Type of Danger</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 p-2 text-white outline-none focus:border-pink-500"
                >
                  <option>Harassment</option>
                  <option>Suspicious Activity</option>
                  <option>Poor Lighting</option>
                  <option>Accident / Hazard</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Additional details..."
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 p-2 text-white outline-none focus:border-pink-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setReportModal({ open: false, lat: null, lng: null })}
                className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={submitDangerPin}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
