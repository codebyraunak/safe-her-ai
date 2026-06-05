import { useState } from "react";
import { requestOTP, verifyOTP } from "../api";

export default function LoginPage({ onLoginSuccess }) {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (phone.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await requestOTP(phone);
      setStep(2);
    } catch (err) {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 4) {
      setError("Please enter the 4-digit OTP.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await verifyOTP(phone, otp);
      if (res.success) {
        onLoginSuccess();
      } else {
        setError("Invalid OTP.");
      }
    } catch (err) {
      setError("Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex justify-center items-center">
        <div className="w-[800px] h-[800px] bg-pink-600/10 rounded-full blur-[120px] opacity-50 translate-y-[-20%]" />
        <div className="absolute w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] opacity-40 translate-x-[20%] translate-y-[20%]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4 animate-bounce-slow">🛡️</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SafeHer <span className="text-pink-500">AI</span></h1>
          <p className="text-slate-400 mt-2">Predict. Alert. Protect.</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">
            {step === 1 ? "Welcome Back" : "Verify Phone Number"}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-900/30 border border-red-500/30 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">📞</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-pink-600 hover:bg-pink-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-pink-500/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Sending OTP..." : "Get OTP"}
              </button>
              <p className="text-center text-xs text-slate-500 mt-4">
                For demo purposes, a mock OTP of <span className="font-mono text-pink-400">1432</span> will be generated.
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-4">
                  We've sent a 4-digit verification code to <span className="text-white">{phone}</span>.
                </p>
                <label className="block text-sm font-medium text-slate-300 mb-2">Verification Code</label>
                <input
                  type="text"
                  maxLength={4}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="1432"
                  className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 px-4 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-pink-600 hover:bg-pink-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-pink-500/20 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Verify & Login"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-slate-400 text-sm hover:text-white transition-colors py-2"
              >
                Use a different number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
