import { useState } from "react";
import { startSafeWalk, cancelSafeWalk, extendSafeWalk } from "../api";

export default function SafeWalkPage({ userInfo, monitor }) {
  const { sw, sc, globalConfirmSafe } = monitor || {};
  const [etaMinutes, setEtaMinutes] = useState(15);
  const [dest, setDest] = useState(sw?.destination || "");

  if (!monitor) return null;

  const handleStart = async () => {
    if (!dest.trim()) return alert("Please enter a destination");
    sw.setDestination(dest);
    try {
      let lat = 12.9716;
      let lng = 77.5946;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => await _start(pos.coords.latitude, pos.coords.longitude),
          async () => await _start(lat, lng)
        );
      } else {
        await _start(lat, lng);
      }
    } catch (err) {
      alert("Failed to start Safe Walk");
    }
  };

  const _start = async (lat, lng) => {
    const res = await startSafeWalk(
      userInfo?.user_id || "anonymous",
      userInfo?.name || "Anonymous",
      dest,
      etaMinutes,
      lat,
      lng,
      userInfo?.emergency_contact || ""
    );
    sw.setEtaTime(new Date(res.eta));
    sw.setActive(true);

    // AUTO-LINK SMART CHECK: Start background smart check with 15 min default
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
      globalConfirmSafe(); // Cancels both SafeWalk and SmartCheck
    } catch (err) {
      alert("Failed to cancel");
    }
  };

  const handleExtend = async () => {
    try {
      const res = await extendSafeWalk(userInfo?.user_id || "anonymous", 10);
      sw.setEtaTime(new Date(res.new_eta));
    } catch (err) {
      alert("Failed to extend");
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-md mx-auto w-full">
      <div className="text-center mt-6">
        <h1 className="text-3xl font-bold text-white mb-2">Safe Walk Mode</h1>
        <p className="text-sm text-slate-400">
          We'll watch your back. Set an ETA and if you don't check in by then, we'll automatically alert your emergency contacts and nearby users.
        </p>
      </div>

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
              <label className="block text-sm text-slate-400 mb-1">Expected time to arrive (minutes)</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="120"
                  value={etaMinutes}
                  onChange={(e) => setEtaMinutes(Number(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-xl font-bold text-emerald-400 w-12 text-center">{etaMinutes}m</span>
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
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/40 animate-ping flex items-center justify-center" />
            <span className="absolute text-2xl text-emerald-400">🛡️</span>
          </div>
          
          <h2 className="text-xl font-semibold text-white mb-1">Heading to {sw.destination}</h2>
          <p className="text-slate-400 mb-6">Tracking active. We're keeping an eye out.</p>

          <div className="text-6xl font-mono font-bold text-white mb-8 tracking-wider font-variant-numeric">
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
