import { useState, useEffect } from "react";

export default function FakeCallPage() {
  const [timer, setTimer] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callerName, setCallerName] = useState("Dad");

  useEffect(() => {
    let interval;
    if (isCounting && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (isCounting && timer === 0) {
      setIsCounting(false);
      setIsRinging(true);
      // Play a ringing sound if possible, though browsers restrict auto-play
    }
    return () => clearInterval(interval);
  }, [isCounting, timer]);

  useEffect(() => {
    let interval;
    if (isAnswered) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAnswered]);

  const startTimer = (seconds) => {
    setTimer(seconds);
    setIsCounting(true);
    setIsRinging(false);
    setIsAnswered(false);
    setCallDuration(0);
  };

  const stopCall = () => {
    setIsCounting(false);
    setIsRinging(false);
    setIsAnswered(false);
    setTimer(0);
    setCallDuration(0);
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (isRinging || isAnswered) {
    return (
      <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-between py-16 px-6 text-white">
        <div className="text-center mt-10">
          <p className="text-xl text-slate-400 mb-2">
            {isAnswered ? formatDuration(callDuration) : "Incoming call..."}
          </p>
          <h1 className="text-5xl font-semibold tracking-wide">{callerName}</h1>
        </div>

        <div className="flex gap-16 mb-20">
          {!isAnswered && (
            <button
              onClick={() => setIsAnswered(true)}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center animate-bounce shadow-[0_0_20px_rgba(34,197,94,0.6)]">
                <span className="text-4xl">📞</span>
              </div>
              <span className="text-sm">Accept</span>
            </button>
          )}

          <button
            onClick={stopCall}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.6)]">
              <span className="text-4xl">📴</span>
            </div>
            <span className="text-sm">Decline</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <h1 className="text-2xl font-bold text-white">Fake Call</h1>
        <p className="text-sm text-slate-400">
          Simulate an incoming call to help you exit an uncomfortable situation.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border border-slate-700/80 bg-slate-900/70 p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 uppercase tracking-wider font-semibold">
              Caller Name
            </label>
            <input
              type="text"
              value={callerName}
              onChange={(e) => setCallerName(e.target.value)}
              className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500"
              placeholder="e.g. Dad, Mom, Roommate"
            />
          </div>

          <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold pt-4">
            Trigger Call In
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Now", seconds: 0 },
              { label: "10 seconds", seconds: 10 },
              { label: "30 seconds", seconds: 30 },
              { label: "1 minute", seconds: 60 },
            ].map((opt) => (
              <button
                key={opt.seconds}
                onClick={() => startTimer(opt.seconds)}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl py-3 px-4 text-center transition"
              >
                <span className="text-white font-medium">{opt.label}</span>
              </button>
            ))}
          </div>

          {isCounting && (
            <div className="mt-6 text-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-amber-400 text-lg">
                Call incoming in <span className="font-bold">{timer}</span> seconds...
              </p>
              <button
                onClick={stopCall}
                className="mt-3 text-sm text-slate-400 hover:text-white underline"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
