import { useState, useEffect } from "react";

export default function StartPage({ userInfo, setUserInfo, onComplete }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [medical, setMedical] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (userInfo) {
      setName(userInfo.name || "");
      setContact(userInfo.emergency_contact || "");
      setMedical(userInfo.medical_details || "");
      setSaved(true);
    }
  }, [userInfo]);

  const saveProfile = () => {
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!contact.trim()) {
      setError("Please enter an emergency contact.");
      return;
    }

    const profile = {
      name: name.trim(),
      emergency_contact: contact.trim(),
      medical_details: medical.trim(),
    };

    localStorage.setItem("safeher_user_info", JSON.stringify(profile));
    setUserInfo(profile);
    setError("");
    setSaved(true);
    if (onComplete) onComplete();
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h1 className="text-2xl font-bold text-white">Set up your safety profile</h1>
        <p className="text-sm text-slate-400">Save your name, emergency contact, and medical details once so SOS can be sent quickly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        <div className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700 space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-2">Full Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm border border-slate-600 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-2">Emergency Contact *</label>
            <input
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="e.g. +91-98765-43210"
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm border border-slate-600 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-2">Medical Details</label>
            <textarea
              value={medical}
              onChange={e => setMedical(e.target.value)}
              placeholder="Allergies, medicines, medical conditions..."
              rows={4}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm border border-slate-600 focus:outline-none focus:border-pink-500 resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={saveProfile}
            className="w-full py-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-sm transition"
          >
            {saved ? "Save updates" : "Save profile"}
          </button>
        </div>

        <div className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700">
          <p className="text-sm text-slate-400 mb-4">Your profile will be stored locally on this device and used automatically on the SOS page.</p>

          <div className="space-y-3">
            <div className="rounded-xl bg-slate-900/50 p-4 border border-slate-700">
              <p className="text-xs uppercase tracking-wide text-slate-500">Saved details</p>
              <p className="mt-3 text-sm text-white">Name: <span className="text-slate-300">{name || "Not set yet"}</span></p>
              <p className="text-sm text-white">Emergency contact: <span className="text-slate-300">{contact || "Not set yet"}</span></p>
              <p className="text-sm text-white">Medical details: <span className="text-slate-300">{medical || "Not set yet"}</span></p>
            </div>

            <div className="rounded-xl bg-emerald-900/20 border border-emerald-500/20 p-4">
              <p className="text-sm font-semibold text-emerald-300">Fast SOS</p>
              <p className="text-xs text-slate-400 mt-1">Your name will auto-fill on the SOS page and your emergency contact will be included when you send an alert.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
