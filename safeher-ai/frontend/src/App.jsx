import { useState, useEffect } from "react";
import HeatmapPage  from "./pages/HeatmapPage";
import RoutePage    from "./pages/RoutePage";
import LightingPage from "./pages/LightingPage";
import SOSPage      from "./pages/SOSPage";
import StartPage    from "./pages/StartPage";
import SmartCheckPage from "./pages/SmartCheckPage";

const NAV = [
  { id: "start",      label: "Profile Setup",      icon: "👤",  desc: "Save your SOS info" },
  { id: "heatmap",    label: "Safety Heatmap",    icon: "🗺️",  desc: "AI-predicted risk zones" },
  { id: "route",      label: "Safe Route Scorer",  icon: "🛣️",  desc: "Score your route" },
  { id: "lighting",   label: "Smart Lighting",     icon: "💡",  desc: "Traffic-based brightness" },
  { id: "smartcheck", label: "Smart Check",        icon: "✅",  desc: "Routine safety monitoring" },
  { id: "sos",        label: "SOS Alert",          icon: "🆘",  desc: "Emergency dispatch" },
];

export default function App() {
  const [page, setPage] = useState("start");
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("safeher_user_info");
    if (stored) {
      try {
        setUserInfo(JSON.parse(stored));
        setPage("heatmap");
      } catch {
        localStorage.removeItem("safeher_user_info");
      }
    }
  }, []);

  const PageComponent = {
    start:      StartPage,
    heatmap:    HeatmapPage,
    route:      RoutePage,
    lighting:   LightingPage,
    smartcheck: SmartCheckPage,
    sos:        SOSPage,
  }[page];

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white">SafeHer <span className="text-pink-500">AI</span></h1>
          <p className="text-xs text-slate-500 mt-0.5">Predict. Alert. Protect.</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`w-full text-left px-3 py-3 rounded-xl transition flex items-center gap-3 ${
                page === n.id
                  ? "bg-pink-600/20 border border-pink-500/30 text-white"
                  : "hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent"
              }`}
            >
              <span className="text-xl">{n.icon}</span>
              <div>
                <p className="text-sm font-medium leading-tight">{n.label}</p>
                <p className="text-xs text-slate-500 leading-tight">{n.desc}</p>
              </div>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-600">SafeHer AI v1.0</p>
         
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        <PageComponent
          userInfo={userInfo}
          setUserInfo={setUserInfo}
          onComplete={() => setPage("heatmap")}
          onEditProfile={() => setPage("start")}
        />
      </main>
    </div>
  );
}
