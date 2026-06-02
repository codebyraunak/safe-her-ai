import { useState, useEffect } from "react";
import HeatmapPage  from "./pages/HeatmapPage";
import RoutePage    from "./pages/RoutePage";
import LightingPage from "./pages/LightingPage";
import SOSPage      from "./pages/SOSPage";
import StartPage    from "./pages/StartPage";
import SmartCheckPage from "./pages/SmartCheckPage";
import FakeCallPage from "./pages/FakeCallPage";
import SafeMonitoringPage from "./pages/SafeMonitoringPage";
import { registerUser } from "./api";
import { useSafetyMonitor } from "./hooks/useSafetyMonitor";

const NAV = [
  { id: "start",      label: "Profile Setup",      icon: "👤",  desc: "Save your SOS info" },
  { id: "heatmap",    label: "Safety Heatmap",    icon: "🗺️",  desc: "AI-predicted risk zones" },
  { id: "route",      label: "Safe Route Scorer",  icon: "🛣️",  desc: "Score your route" },
  { id: "safewalk",   label: "Safe Monitoring",    icon: "🛡️", desc: "SafeWalk & Smart Check" },
  { id: "lighting",   label: "Smart Lighting",     icon: "💡",  desc: "Working & broken status" },
  { id: "fakecall",   label: "Fake Call",          icon: "📞",  desc: "Simulate an incoming call" },
  { id: "sos",        label: "SOS Alert",          icon: "🆘",  desc: "Emergency dispatch" },
];

export default function App() {
  const [page, setPage] = useState("start");
  const [userInfo, setUserInfo] = useState(null);
  const [currentPos, setCurrentPos] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  const monitor = useSafetyMonitor(userInfo, currentPos);
  const currentPage = NAV.find((item) => item.id === page) ?? NAV[0];

  useEffect(() => {
    const stored = localStorage.getItem("safeher_user_info");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (!parsed.user_id) {
          parsed.user_id = crypto.randomUUID();
          localStorage.setItem("safeher_user_info", JSON.stringify(parsed));
        }
        setUserInfo(parsed);
        setPage("heatmap");
      } catch {
        localStorage.removeItem("safeher_user_info");
      }
    }
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
    if (userInfo && currentPos) {
      registerUser(
        userInfo.user_id,
        userInfo.name,
        userInfo.emergency_contact,
        userInfo.medical_details,
        currentPos[0],
        currentPos[1],
      ).catch(() => {});
    }
  }, [userInfo, currentPos]);

  useEffect(() => {
    const promptHandler = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const installedHandler = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", promptHandler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", promptHandler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
      setSidebarCollapsed(false);
    }
  }, [page]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateSidebarState = () => {
        setSidebarOpen(window.innerWidth >= 1024);
        if (window.innerWidth < 1024) {
          setSidebarCollapsed(false);
        }
      };

      updateSidebarState();
      window.addEventListener("resize", updateSidebarState);
      return () => window.removeEventListener("resize", updateSidebarState);
    }
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleNavigate = (id) => {
    setPage(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const sidebarWidthClass = sidebarCollapsed ? "lg:w-20" : "lg:w-72";
  const mainMarginClass = sidebarCollapsed ? "lg:ml-20" : "lg:ml-72";

  const PageComponent = {
    start:      StartPage,
    heatmap:    HeatmapPage,
    route:      RoutePage,
    safewalk:   SafeMonitoringPage,
    lighting:   LightingPage,
    fakecall:   FakeCallPage,
    sos:        SOSPage,
  }[page] || StartPage;

  return (
    <div className="relative min-h-screen bg-slate-900 text-white">
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-sm lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-black/20 hover:bg-pink-500"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? "Close" : "Menu"}
        </button>
        <div className="text-sm font-semibold uppercase tracking-wide text-white">SafeHer AI</div>
        <div className="w-20" />
      </header>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/70 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 transform border-r border-slate-800 bg-slate-950 transition-all duration-300 ease-in-out w-72 ${sidebarWidthClass} ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:fixed lg:top-0 lg:left-0 lg:bottom-0 lg:h-screen`}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🛡️</div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-white">SafeHer <span className="text-pink-500">AI</span></h1>
                <p className="text-xs text-slate-500">Predict. Alert. Protect.</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="rounded-full bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? "➡️" : "⬅️"}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden rounded-full bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              title={item.label}
              className={`group flex w-full ${sidebarCollapsed ? "justify-center" : "items-start"} gap-3 rounded-2xl px-4 py-3 text-left transition ${
                page === item.id
                  ? "bg-pink-600/15 text-white ring-1 ring-pink-500"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              {!sidebarCollapsed && (
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-slate-500 group-hover:text-slate-300">{item.desc}</p>
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className={`border-t border-slate-800 ${sidebarCollapsed ? "px-2 py-4" : "px-5 py-4"}`}>
          <div className="space-y-3">
            <button
              onClick={promptInstall}
              className="w-full rounded-2xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-500"
            >
              {installed ? "✓ Installed" : "⬇️ Install app"}
            </button>

            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
              App version
            </div>
            <div className="text-sm text-slate-300">SafeHer AI v1.0</div>
          </div>
        </div>
      </aside>

      <header className="hidden lg:flex fixed inset-x-0 top-0 z-50 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-6 py-4 shadow-lg shadow-black/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🛡️</div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-300">SafeHer AI</div>
            <div className="text-xs text-slate-500">Predict. Alert. Protect.</div>
          </div>
        </div>
      </header>

      <main className={`relative min-h-screen overflow-x-hidden ${mainMarginClass} pt-16 lg:pt-24`}>
        <div className="h-16 lg:hidden" />
        <div className="p-6 lg:p-8">
          <div>
            <PageComponent
              userInfo={userInfo}
              setUserInfo={setUserInfo}
              onComplete={() => setPage("heatmap")}
              onEditProfile={() => setPage("start")}
              monitor={monitor}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
