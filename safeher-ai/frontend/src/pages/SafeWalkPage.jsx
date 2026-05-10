import { useState, useEffect, useRef } from "react";
import { startSafeWalk, cancelSafeWalk, extendSafeWalk } from "../api";

export default function SafeWalkPage({ userInfo, monitor, isSubComponent }) {
  const { sw, sc, globalConfirmSafe } = monitor || {};
  const [etaMinutes, setEtaMinutes] = useState(15);
  const [dest, setDest] = useState("");
  const intervalRef = useRef(null);

  if (!monitor) return null;

  const handleStart = async () => {
    if (!dest.trim()) return alert("Please enter a destination");
    
    const totalSeconds = etaMinutes * 60;
    sw.setDestination(dest);
    sw.setTimeLeft(totalSeconds);
    sw.setActive(true);

    // Start countdown directly here — no dependency on backend or context
    clearInterval(intervalRef.current);
    let remaining = totalSeconds;
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      sw.setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        alert("⚠️ SafeWalk timer expired!");
      }
    }, 1000);

    if (sc.status === "idle" || sc.status === "safe" || sc.status === "alerted") {
      sc.setTimerMinutes(15);
      sc.setCountdown(15 * 60);
      sc.setStatus("pending");
    }

    try {
      await startSafeWalk(userInfo?.user_id || "anonymous", userInfo?.name || "Anonymous", dest, etaMinutes, 12.9716, 77.5946, userInfo?.emergency_contact || "");
    } catch (err) {}
  };

  const handleCancel = () => {
    clearInterval(intervalRef.current);
    globalConfirmSafe();
  };

  const handleExtend = () => {
    sw.setTimeLeft(sw.timeLeft + 10 * 60);
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
          <p className="text-sm text-slate-400">We'll watch your back. Set an ETA and if you don't check in by then, we'll automatically alert your emergency contacts and nearby users.</p>
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
              <input type="
