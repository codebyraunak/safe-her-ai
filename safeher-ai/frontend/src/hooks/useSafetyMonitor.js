import { useState, useEffect, useRef } from "react";
import { triggerSOS } from "../api";

export function useSafetyMonitor(userInfo, currentPos) {
  // SafeWalk State
  const [swActive, setSwActive] = useState(false);
  const [swEtaTime, setSwEtaTime] = useState(null);
  const [swDestination, setSwDestination] = useState("");
  const [swTimeLeft, setSwTimeLeft] = useState(0);

  // SmartCheck State
  const [scStatus, setScStatus] = useState("idle");
  const [scCountdown, setScCountdown] = useState(15 * 60);
  const [scTimerMinutes, setScTimerMinutes] = useState(15);
  const [scResult, setScResult] = useState(null);
  const [scMessage, setScMessage] = useState("");

  const handledSosRef = useRef({ sw: false, sc: false });
  const intervalRef = useRef(null);

  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Only run if either SafeWalk is active OR SmartCheck is pending
    if (!swActive && scStatus !== "pending") return;

    intervalRef.current = setInterval(() => {
      const now = new Date();

      // ── SafeWalk countdown ──
      if (swActive && swEtaTime) {
        const diff = Math.max(0, Math.floor((swEtaTime - now) / 1000));
        setSwTimeLeft(diff);

        if (diff === 0 && !handledSosRef.current.sw) {
          handledSosRef.current.sw = true;
          if (userInfo && currentPos) {
            triggerSOS(
              currentPos[0], currentPos[1],
              userInfo.user_id, userInfo.name,
              "SafeWalk ETA expired without confirmation.",
              userInfo.emergency_contact, userInfo.medical_details
            ).catch(() => {});
          }
        }
      }

      // ── SmartCheck countdown ──
      if (scStatus === "pending") {
        setScCountdown((prev) => {
          if (prev <= 1 && !handledSosRef.current.sc) {
            handledSosRef.current.sc = true;
            setScStatus("alerted");
            setScMessage(`No response within ${scTimerMinutes} minutes. Alert triggered.`);
            if (userInfo && currentPos) {
              triggerSOS(
                currentPos[0], currentPos[1],
                userInfo.user_id, userInfo.name,
                "Smart Check failed: user did not confirm safe.",
                userInfo.emergency_contact, userInfo.medical_details
              ).then((res) => setScResult(res)).catch(() => {});
            }
            return 0;
          }
          return Math.max(prev - 1, 0);
        });
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [swActive, swEtaTime, scStatus, userInfo, currentPos, scTimerMinutes]);

  const globalConfirmSafe = () => {
    setSwActive(false);
    setSwEtaTime(null);
    setSwTimeLeft(0);
    setSwDestination("");

    setScStatus("safe");
    setScMessage("You are marked safe. No alert was sent.");
    setScCountdown(scTimerMinutes * 60);

    handledSosRef.current = { sw: false, sc: false };
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return {
    sw: {
      active: swActive,
      setActive: setSwActive,
      etaTime: swEtaTime,
      setEtaTime: setSwEtaTime,
      destination: swDestination,
      setDestination: setSwDestination,
      timeLeft: swTimeLeft,
      setTimeLeft: setSwTimeLeft,   // ← exposed so SafeWalkPage can set initial value
    },
    sc: {
      status: scStatus,
      setStatus: (st) => {
        setScStatus(st);
        if (st === "pending") handledSosRef.current.sc = false;
      },
      countdown: scCountdown,
      setCountdown: setScCountdown,
      timerMinutes: scTimerMinutes,
      setTimerMinutes: setScTimerMinutes,
      result: scResult,
      setResult: setScResult,
      message: scMessage,
      setMessage: setScMessage,
    },
    globalConfirmSafe,
  };
}
