import { useState } from "react";
import { startSafeWalk, cancelSafeWalk, extendSafeWalk } from "../api";

export default function SafeWalkPage({ userInfo, monitor, isSubComponent }) {
  const { sw, sc, globalConfirmSafe } = monitor || {};
  const [etaMinutes, setEtaMinutes] = useState(15);
  const [dest, setDest] = useState("");

  if (!monitor) return null;

  const handleStart = async () => {
    if (!dest.trim()) return alert("Please enter a destination");

    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => await _start(dest, pos.coords.latitude, pos.coords.longitude),
          async () => await _start(dest, 12.9716, 77.5946)
        );
      } else {
        await _start(dest, 12.9716, 77.5946);
      }
    } catch (err) {
      alert("Failed to start Safe Walk");
    }
  };

  const _start = async (destination, lat, lng) => {
    sw.setDestination(destination);

    try {
      await startSafeWalk(
        userInfo?.user_id || "anonymous",
        userInfo?.name || "Anonymous",
        destination,
        etaMinutes,
        lat,
        lng,
        userInfo?.emergency_contact || ""
      );
    } catch (err) {
      // continue even if backend fails — timer still works
    }

    const etaTime = new Date(Date.now() + etaMinutes * 60 * 1000);
    sw.setEtaTime(etaTime);
    sw.setTimeLeft(etaMinutes * 60);
    sw.setActive(true);

    // AUTO-LINK SMART CHECK
    if (sc.status === "idle" || sc.status === "safe" || sc.status === "alerted") {
      sc.setTimerMinutes(15);
      sc.setCountdown(15 * 60);
      sc.setStatus("pending");
      sc.setMessage("Auto-started by SafeWalk. Tap 'I'm Safe' when you arrive.");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelSafeWalk(userInfo?.user_id || "anonymous");
    } catch (err) {
      // ignore
    }
    globalConfirmSafe();
  };

  const handleExtend = async () => {
    try {
      await extendSafeWalk(userInfo?.user_id || "anonymous", 10);
    } catch (err) {
      // ignore
    }
    sw.setEtaTime(new Date(Date.now() + 10 * 60 * 1000 + sw.timeLeft * 1000));
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-md mx-auto w-full">
      {!isSubComponent && (
        <div className="text-center mt-6">
          <h1 className="text-3xl font-bold text-white mb-2">Safe Walk Mode</h1>
          <p className="text-sm text-slate-400">
            We'll watch your back. Set an ETA and if you don't check in by then, we'll
            automatically alert your emergency contacts and nearby users.
          </p>
        </div>
      )}
      {isSubComponent && (
        <div className="text-center mt-2 mb-2">
          <h2 className="text-2xl font-bold text-white mb-1">Safe Walk</h2>
          <p className="text-xs text-slate-400">Live destination tracking & ETA alerts.</p>
        </div>
      )}

      {!sw.active ? (
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 mt-4 shadow-xl">
          <div className="space-y-5">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Where are you heading?</label>
              <input
                type="text"
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                placeholder="e.g. Home, Subway Station"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                Expected time to arrive (minutes)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="120"
                  value={etaMinutes}
                  onChange={(e) => setEtaMinutes(Number(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-xl font-bold text-emerald-400 w-12 text-center">
                  {etaMinutes}m
                </span>
              </div>
            </div>
            <button
              onClick={handleStart}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-colors mt-4 text-lg"
            >
              Start Safe Walk
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-emerald-500/50 rounded-2xl p-6 mt-4 shadow-2xl shadow-emerald-900/20 text-center flex flex-col items-center">
          <div className="relative w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <div className="absolute w-16 h-16 rounded-full bg-emerald-500/40 animate-ping" />
            <span className="relative text-2xl">🛡️</span>
          </div>

          <h2 className="text-xl font-semibold text-white mb-1">
            Heading to {sw.destination}
          </h2>
          <p className="text-slate-400 mb-6">Tracking active. We're keeping an eye out.</p>

          <div className="text-6xl font-mono font-bold text-white mb-8 tracking-wider">
            {formatTime(sw.timeLeft)}
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              onClick={handleExtend}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              +10 Mins
            </button>
            <button
              onClick={handleCancel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-colors"
            >
              I'm Safe
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
