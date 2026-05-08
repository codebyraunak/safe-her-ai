import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import { triggerSOS } from "../api";
import "leaflet/dist/leaflet.css";

const DEFAULT_POS = [12.9716, 77.5946];
const CHECK_SECONDS = 15 * 60;
const HOME_RADIUS_METERS = 200;

function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function SmartCheckPage({ userInfo, onEditProfile }) {
  const [currentPos, setCurrentPos] = useState(DEFAULT_POS);
  const [homePos, setHomePos] = useState(null);
  const [countdown, setCountdown] = useState(CHECK_SECONDS);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [timerMinutes, setTimerMinutes] = useState(15);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem("safeher_home_location");
    if (stored) {
      try {
        setHomePos(JSON.parse(stored));
      } catch {
        localStorage.removeItem("safeher_home_location");
      }
    }
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCurrentPos([p.coords.latitude, p.coords.longitude]),
        () => {},
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const saveHomeLocation = () => {
    localStorage.setItem("safeher_home_location", JSON.stringify(currentPos));
    setHomePos(currentPos);
    setMessage("Home location saved. You can now start smart monitoring.");
  };

  const clearMonitoring = () => {
    clearInterval(intervalRef.current);
    clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
  };

  const stopMonitoring = () => {
    clearMonitoring();
    setStatus("idle");
    setCountdown(timerMinutes * 60);
  };

  const startMonitoring = () => {
    if (!userInfo?.name || !userInfo?.emergency_contact) {
      setMessage("Please complete your profile first for Smart Check.");
      return;
    }
    if (!homePos) {
      setMessage("Please save your home location before starting Smart Check.");
      return;
    }

    const timerSeconds = timerMinutes * 60;
    setStatus("pending");
    setMessage("Smart Check is active. Tap SAFE if you are okay before the timer expires.");
    setResult(null);
    setCountdown(timerSeconds);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    timeoutRef.current = setTimeout(() => {
      triggerAlarm();
    }, timerSeconds * 1000);
  };

  const confirmSafe = () => {
    if (status !== "pending") return;
    clearMonitoring();
    setStatus("safe");
    setMessage("You are marked safe. No alert was sent.");
  };

  const triggerAlarm = async () => {
    clearMonitoring();
    setStatus("alerted");
    setMessage(
      `No response within ${timerMinutes} minutes. Alert triggered to ${userInfo?.emergency_contact || "your emergency contact"}.`,
    );

    try {
      const data = await triggerSOS(
        currentPos[0],
        currentPos[1],
        userInfo.user_id,
        userInfo.name,
        "Smart Check failed: user did not confirm safe.",
        userInfo.emergency_contact,
        userInfo.medical_details,
      );
      setResult(data);
    } catch {
      setMessage("Emergency alert could not be sent. Please try again later.");
    }
  };

  const homeDistance = homePos
    ? haversineDistance(currentPos[0], currentPos[1], homePos[0], homePos[1])
    : null;

  const isAtHome = homeDistance !== null && homeDistance <= HOME_RADIUS_METERS;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h1 className="text-2xl font-bold text-white">Smart Check</h1>
        <p className="text-sm text-slate-400">Monitor your routine and send an automatic alert if you don’t confirm safety in time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        <div className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700 space-y-4">
          <div className="rounded-2xl bg-slate-900/50 p-4 border border-slate-700">
            <p className="text-sm text-slate-400">Home location</p>
            <p className="text-white mt-2">{homePos ? `${homePos[0].toFixed(5)}, ${homePos[1].toFixed(5)}` : "Not set"}</p>
            <button
              onClick={saveHomeLocation}
              className="mt-4 px-4 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm w-full"
            >
              Save current position as home location
            </button>
          </div>

          <div className="rounded-2xl bg-slate-900/50 p-4 border border-slate-700">
            <p className="text-sm text-slate-400">Current position</p>
            <p className="text-white mt-2">{currentPos[0].toFixed(5)}, {currentPos[1].toFixed(5)}</p>
            <p className="text-xs text-slate-500 mt-2">
              {homePos ? `You are ${Math.round(homeDistance)} meters from home.` : "Set home location first."}
            </p>
            <p className={`text-sm mt-2 ${isAtHome ? "text-emerald-300" : "text-amber-300"}`}>
              {homePos ? (isAtHome ? "Status: at home" : "Status: away from home") : "Home location is required."}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={startMonitoring}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                Start Smart Check
              </button>
              <button
                onClick={confirmSafe}
                disabled={status !== "pending"}
                className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold disabled:opacity-50"
              >
                I’m Safe
              </button>
            </div>
            <button
              onClick={stopMonitoring}
              className="w-full py-3 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-700"
            >
              Stop Monitoring
            </button>
          </div>

          <div className="rounded-2xl bg-slate-900/50 p-4 border border-slate-700">
            <p className="text-sm text-slate-400">Timer Duration</p>
            <div className="flex items-center gap-3 mt-3">
              <input
                type="number"
                min="1"
                max="60"
                value={timerMinutes}
                onChange={(e) => {
                  const value = Math.max(1, Math.min(60, parseInt(e.target.value) || 1));
                  setTimerMinutes(value);
                  if (status === "idle") {
                    setCountdown(value * 60);
                  }
                }}
                disabled={status === "pending"}
                className="w-20 px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-pink-500 disabled:opacity-50"
              />
              <span className="text-white">minutes</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Set how long to wait before triggering an alert if you don't confirm safety.</p>
          </div>

          <div className="rounded-2xl bg-slate-900/50 p-4 border border-slate-700">
            <p className="text-sm text-slate-400">Timer</p>
            <div className="flex items-center justify-center mt-3">
              <div className="relative">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="#374151"
                    strokeWidth="8"
                    fill="none"
                  />
                  {status === "pending" && (
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke={countdown < 300 ? "#ef4444" : countdown < 600 ? "#f59e0b" : "#22c55e"}
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - countdown / (timerMinutes * 60))}`}
                      className="transition-all duration-1000 ease-linear"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{status === "pending" ? formatTime(countdown) : formatTime(timerMinutes * 60)}</p>
                    <p className="text-xs text-slate-500">minutes</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">If you don't confirm safety before the timer runs out, the app will trigger an alert.</p>
          </div>

          {message && (
            <div className="rounded-2xl bg-blue-900/30 border border-blue-500/30 p-4 text-sm text-slate-200">
              {message}
            </div>
          )}

          {!userInfo && (
            <div className="rounded-2xl bg-yellow-900/30 border border-yellow-500/30 p-4 text-sm text-slate-200">
              <p className="font-semibold">Profile required</p>
              <p className="mt-2">Please save your profile first so Smart Check can notify your emergency contact.</p>
              <button
                onClick={onEditProfile}
                className="mt-3 px-4 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm"
              >
                Go to Profile Setup
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700">
          <p className="text-sm text-slate-400">Smart Check alert history</p>
          {result ? (
            <div className="mt-4 rounded-2xl bg-green-900/30 border border-green-500/30 p-4 text-sm text-slate-200 space-y-2">
              <p className="font-semibold">Alert triggered</p>
              <p>Alert ID: {result.alert_id}</p>
              <p>Station: {result.nearest_station?.name}</p>
              <p>Contact: {result.emergency_contact || "N/A"}</p>
              <p>Medical: {result.medical_details || "N/A"}</p>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-slate-900/30 border border-slate-700 p-4 text-sm text-slate-400">
              No Smart Check alert has been triggered yet.
            </div>
          )}

          <div className="mt-6 rounded-2xl bg-slate-900/30 border border-slate-700 p-4 text-sm text-slate-400">
            <p className="font-semibold">How it works</p>
            <ul className="mt-3 space-y-2 list-disc list-inside text-slate-400">
              <li>Save your home location.</li>
              <li>Start Smart Check before you leave.</li>
              <li>If you do not confirm safe within the set time, the app triggers an alert.</li>
              <li>The alert includes your emergency contact and medical details.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
