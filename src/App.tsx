import { useMemo, useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { Inventory } from "./pages/Inventory";
import { Customers } from "./pages/Customers";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { ActivityLog } from "./pages/ActivityLog";
import { AuthOverlay } from "./pages/AuthOverlay";
import { can } from "./utils/permissions";
import { CalculatorWidget } from "./components/CalculatorWidget";
import { CalendarModal } from "./components/CalendarModal";

type PageKey =
  | "dashboard"
  | "sales"
  | "inventory"
  | "customers"
  | "reports"
  | "settings"
  | "activity_log";

const UdhIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="8" height="8" rx="2" fill="#f59e0b" />
    <rect x="14" y="4" width="8" height="8" rx="2" fill="#fbbf24" />
    <rect x="9" y="14" width="8" height="8" rx="2" fill="#f59e0b" />
  </svg>
);

const navIcon = (d: string) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Shell = () => {
  const { user, logout, loading, transactions } = useApp();
  const [page, setPage] = useState<PageKey>("dashboard");
  const [dashMode, setDashMode] = useState<"sales" | "buy">("sales");
  const [showCalculator, setShowCalculator] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const title = useMemo(() => {
    switch (page) {
      case "sales":
        return "Transactions Log";
      case "inventory":
        return "Stock Inventory";
      case "customers":
        return "Customer Database";
      case "reports":
        return "Reports & Analytics";
      case "settings":
        return "Application Settings";
      case "activity_log":
        return "System Activity Log";
      default:
        return "Home Overview";
    }
  }, [page]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  const navItems = [
    { key: "dashboard" as const, label: "Home", icon: navIcon("M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z") },
    { key: "sales" as const, label: "Transactions", icon: navIcon("M6 7h12M6 12h12M6 17h8") },
    { key: "inventory" as const, label: "Inventory", icon: navIcon("M4 7h16M4 12h16M4 17h16") },
    { key: "customers" as const, label: "Customers", icon: navIcon("M16 18v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M12 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0") },
    { key: "reports" as const, label: "Reports", icon: navIcon("M4 19h16M7 16V8m5 8V6m5 10V10") },
    { key: "settings" as const, label: "Settings", icon: navIcon("M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.94 4a7.95 7.95 0 0 0-.12-1l2.02-1.58-1.5-2.6-2.42.98a7.9 7.9 0 0 0-1.73-1l-.37-2.54h-3l-.37 2.54c-.6.24-1.18.57-1.72 1l-2.43-.98-1.5 2.6 2.02 1.58c-.08.33-.12.66-.12 1s.04.67.12 1l-2.02 1.58 1.5 2.6 2.43-.98c.54.43 1.12.76 1.72 1l.37 2.54h3l.37-2.54c.6-.24 1.18-.57 1.72-1l2.43.98 1.5-2.6-2.02-1.58c.08-.33.12-.66.12-1Z") },
    { key: "activity_log" as const, label: "Activity Log", icon: navIcon("M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z") },
  ];

  return (
    <div className="min-h-screen bg-[#fbf7f2] text-slate-900">
      {!user && <AuthOverlay />}

      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 hidden w-[76px] flex-col items-center gap-4 bg-[#0b1a2a] py-6 shadow-xl md:flex">
          <div className="flex items-center justify-center">
            <UdhIcon />
          </div>
          <nav className="mt-6 flex flex-1 flex-col items-center gap-3">
            {navItems
              .filter((item) => {
                if (item.key === "inventory") return can(user, "reports") || can(user, "limits");
                if (item.key === "reports") return can(user, "reports");
                if (item.key === "activity_log") return user?.role === "Technical Team";
                return true;
              })
              .map((item) => (
                <button
                  key={item.key}
                  className={`nav-btn ${page === item.key ? "nav-active" : ""}`}
                  onClick={() => setPage(item.key)}
                  title={item.label}
                >
                  {item.icon}
                </button>
              ))}
          </nav>
          {user && (
            <div className="mb-2 flex flex-col items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <button className="text-xs text-slate-300 hover:text-white" onClick={logout}>
                Logout
              </button>
            </div>
          )}
        </aside>

        <main className="flex-1 md:ml-[76px]">
          <header className="sticky top-0 z-10 border-b border-slate-200/60 bg-[#fbf7f2]/80 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm md:hidden"
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open menu"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
                <div className="text-xl font-semibold">{title}</div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 shadow-sm sm:w-auto">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <input
                    className="w-full bg-transparent text-sm text-slate-600 placeholder:text-slate-400 outline-none sm:w-56"
                    placeholder="Search customer, product, or amount... (Alt+S)"
                  />
                </div>
                <select className="udh-pill">
                  <option>Monthly</option>
                  <option>Weekly</option>
                  <option>Yearly</option>
                </select>
                <button className="udh-pill p-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M8 4v3M16 4v3M4 9h16M6 20h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
                <div className="flex items-center rounded-xl bg-white p-1 text-sm shadow-sm">
                  <button
                    className={`flex items-center gap-2 rounded-lg px-3 py-1 transition-colors ${dashMode === "sales" ? "bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-white shadow" : "text-slate-400 hover:bg-slate-50"}`}
                    onClick={() => setDashMode("sales")}
                  >
                    <span className="text-sm font-medium">Sales</span>
                  </button>
                  <button
                    className={`flex items-center gap-2 rounded-lg px-3 py-1 transition-colors ${dashMode === "buy" ? "bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-white shadow" : "text-slate-400 hover:bg-slate-50"}`}
                    onClick={() => setDashMode("buy")}
                  >
                    <span className="text-sm font-medium">Buy</span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="px-4 py-5 sm:px-6">
            {page === "dashboard" && <Dashboard dashMode={dashMode} />}
            {page === "sales" && <Transactions dashMode={dashMode} />}
            {page === "inventory" && <Inventory dashMode={dashMode} />}
            {page === "customers" && <Customers dashMode={dashMode} />}
            {page === "reports" && <Reports dashMode={dashMode} />}
            {page === "settings" && (
              <Settings
                dashMode={dashMode}
                onToggleCalculator={() => setShowCalculator((s) => !s)}
                onToggleCalendar={() => setShowCalendar((s) => !s)}
              />
            )}
            {page === "activity_log" && <ActivityLog />}
          </div>
        </main>
      </div>

      <CalculatorWidget open={showCalculator} onClose={() => setShowCalculator(false)} />
      <CalendarModal
        open={showCalendar}
        onClose={() => setShowCalendar(false)}
        reminderDates={transactions
          .filter((t) => t.status === "booked" && t.promiseDate)
          .map((t) => t.promiseDate || "")
          .filter(Boolean)}
      />
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileNavOpen(false)}>
          <div
            className="h-full w-64 bg-[#0b1a2a] p-5 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <UdhIcon />
              <button onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
                ✕
              </button>
            </div>
            <nav className="mt-6 space-y-2">
              {navItems
                .filter((item) => {
                  if (item.key === "inventory") return can(user, "reports") || can(user, "limits");
                  if (item.key === "reports") return can(user, "reports");
                  if (item.key === "activity_log") return user?.role === "Technical Team";
                  return true;
                })
                .map((item) => (
                  <button
                    key={item.key}
                    className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition-colors ${page === item.key ? "bg-orange-500 text-white shadow-lg" : "text-slate-300 hover:bg-[#1e293b] hover:text-white"
                      }`}
                    onClick={() => {
                      setPage(item.key);
                      setMobileNavOpen(false);
                    }}
                  >
                    <span className="flex h-6 w-6 items-center justify-center">
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
};

export default App;
