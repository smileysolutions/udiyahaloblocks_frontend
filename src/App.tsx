import { useMemo, useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { Inventory } from "./pages/Inventory";
import { Dealers } from "./pages/Dealers";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { ActivityLog } from "./pages/ActivityLog";
import { UserManagement } from "./pages/UserManagement";
import { AuthOverlay } from "./pages/AuthOverlay";
import { can } from "./utils/permissions";
import { CalculatorWidget } from "./components/CalculatorWidget";
import { CalendarModal } from "./components/CalendarModal";

type PageKey =
  | "dashboard"
  | "sales"
  | "inventory"
  | "dealers"
  | "reports"
  | "settings"
  | "users"
  | "activity_log";

const UdhIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="8" height="8" rx="2" fill="#f59e0b" />
    <rect x="14" y="4" width="8" height="8" rx="2" fill="#fbbf24" />
    <rect x="9" y="14" width="8" height="8" rx="2" fill="#f59e0b" />
  </svg>
);

const Shell = () => {
  const { user, logout, loading, transactions, settings, updateSettings, fabAction, setHighlightId } = useApp();
  const [page, setPage] = useState<PageKey>("dashboard");
  const [dashMode, setDashMode] = useState<"sales" | "buy">("sales");
  const [showCalendar, setShowCalendar] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [timeLimit, setTimeLimit] = useState<"Daily" | "Weekly" | "Monthly" | "Yearly">("Monthly");
  const [searchQuery, setSearchQuery] = useState("");

  const title = useMemo(() => {
    switch (page) {
      case "sales":
        return "Transactions Log";
      case "inventory":
        return "Stock Inventory";
      case "dealers":
        return "Dealer Database";
      case "reports":
        return "Reports & Analytics";
      case "settings":
        return "Application Settings";
      case "users":
        return "User Management";
      case "activity_log":
        return "System Activity Log";
      default:
        return "Home Overview";
    }
  }, [page]);


  const navigateToEvent = (id: string, type: "buy" | "sell") => {
    setShowCalendar(false);
    setPage("sales");
    setDashMode(type === "buy" ? "buy" : "sales");
    setHighlightId(id);
    // Auto-clear highlight after 2 seconds done in the page component
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  const navItems = [
    { key: "dashboard" as const, label: "Home", icon: "fas fa-chart-pie" },
    { key: "sales" as const, label: "Transactions", icon: "fas fa-exchange-alt" },
    { key: "inventory" as const, label: "Inventory", icon: "fas fa-warehouse" },
    { key: "dealers" as const, label: "Dealers", icon: "fas fa-users" },
    { key: "reports" as const, label: "Reports", icon: "fas fa-file-invoice-dollar" },
    { key: "settings" as const, label: "Settings", icon: "fas fa-cog" },
    { key: "users" as const, label: "Users", icon: "fas fa-user-shield" },
    { key: "activity_log" as const, label: "Activity Log", icon: "fas fa-clipboard-list" },
  ];

  if (!user) {
    return <AuthOverlay />;
  }

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-[#0f172a]">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 hidden w-[76px] flex-col bg-[#0f172a] shadow-xl transition-[width] duration-300 ease-in-out hover:w-[260px] md:flex group z-50 overflow-hidden no-print">
          <div className="flex h-[90px] items-center px-6 gap-4">
            <div className="flex min-w-[26px] items-center justify-center">
              <UdhIcon />
            </div>
            <span className="udh-font-heading text-2xl font-bold text-[#f59e0b] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">UDH</span>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-2">
            {navItems
              .filter((item) => {
                if (item.key === "inventory") return can(user, "reports") || can(user, "limits");
                if (item.key === "reports") return can(user, "reports");
                if (item.key === "users") return user?.role === "Technical Team" || user?.role === "Owner";
                if (item.key === "activity_log") return user?.role === "Technical Team";
                return true;
              })
              .map((item) => (
                <button
                  key={item.key}
                  className={`mx-3 flex items-center rounded-2xl px-4 py-4 transition-all duration-300 ${page === item.key
                    ? "bg-[#f59e0b] text-white shadow-lg shadow-[#f59e0b]/30 translate-x-1"
                    : "text-[#94a3b8] hover:bg-white/5 hover:text-white hover:translate-x-1"
                    }`}
                  onClick={() => setPage(item.key)}
                >
                  <i className={`${item.icon} min-w-[24px] text-center text-xl`}></i>
                  <span className="ml-4 font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              ))}
          </nav>

          {user && (
            <div className="mt-auto px-3 pb-6">
              <div className="flex items-center gap-4 rounded-2xl bg-white/5 p-3">
                <div className="flex h-10 w-10 min-w-[40px] items-center justify-center rounded-full bg-[#f59e0b] font-bold text-white shadow-md">
                  {user.username.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex flex-1 flex-col overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="truncate text-sm font-bold text-white">{user.username}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{user.role}</span>
                </div>
                <button
                  className="rounded-lg bg-white/10 p-2 text-red-400 hover:bg-white/20 transition-opacity"
                  onClick={logout}
                  title="Logout"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </button>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 md:ml-[76px] w-full">
          <header className="sticky top-0 z-10 flex h-auto sm:h-[90px] items-center bg-transparent px-4 sm:px-8 py-4 sm:py-0 no-print">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm md:hidden"
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open menu"
                >
                  <i className="fas fa-bars text-lg"></i>
                </button>
                <h1 className="udh-font-heading text-xl sm:text-3xl font-extrabold tracking-tight text-[#0f172a] truncate">
                  {title}
                </h1>
              </div>

              {["dashboard", "sales", "inventory", "dealers"].includes(page) && (
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="relative hidden lg:flex w-[300px] xl:w-[400px] items-center">
                    <i className="fas fa-search absolute left-4 text-slate-400"></i>
                    <input
                      className="w-full rounded-2xl border-none bg-slate-100 py-3 pl-12 pr-4 text-sm text-slate-600 placeholder:text-slate-400 focus:ring-2 focus:ring-[#f59e0b]/20 outline-none"
                      placeholder="Search... (Alt+S)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2">
                    <select
                      className="udh-pill border-none bg-white font-bold text-slate-600 shadow-sm focus:ring-2 focus:ring-[#f59e0b]/20 hidden sm:block"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value as any)}
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Yearly">Yearly</option>
                    </select>

                    {settings.calendarEnabled && (
                      <button
                        className="udh-pill border-none bg-white p-2 sm:p-3 text-[#f59e0b] shadow-sm hover:opacity-80 transition-all font-bold flex items-center gap-2 relative"
                        onClick={() => setShowCalendar(true)}
                      >
                        <i className="fas fa-calendar-alt text-base sm:text-lg"></i>
                        <span className="hidden xl:inline text-xs">CALENDAR</span>
                      </button>
                    )}

                    <div className="flex rounded-xl bg-slate-100 p-1 sm:p-1.5 shadow-inner scale-90 sm:scale-100 origin-right">
                      <button
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all duration-200 ${dashMode === "sales" ? "bg-white text-[#f59e0b] font-bold shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                        onClick={() => setDashMode("sales")}
                      >
                        <i className="fas fa-shopping-cart text-sm"></i>
                        <span className="text-sm">Sales</span>
                      </button>
                      <button
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all duration-200 ${dashMode === "buy" ? "bg-white text-[#f59e0b] font-bold shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                        onClick={() => setDashMode("buy")}
                      >
                        <i className="fas fa-truck text-sm"></i>
                        <span className="text-sm">Buy</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </header>

          <div className="px-4 sm:px-8 pb-12">
            {page === "dashboard" && <Dashboard dashMode={dashMode} setPage={setPage} timeLimit={timeLimit} searchQuery={searchQuery} />}
            {page === "sales" && <Transactions dashMode={dashMode} searchQuery={searchQuery} />}
            {page === "inventory" && <Inventory dashMode={dashMode} searchQuery={searchQuery} />}
            {page === "dealers" && <Dealers dashMode={dashMode} searchQuery={searchQuery} />}
            {page === "reports" && <Reports dashMode={dashMode} />}
            {page === "settings" && (
              <Settings
                dashMode={dashMode}
                onToggleCalculator={() => updateSettings("calcEnabled", !settings.calcEnabled)}
                onToggleCalendar={() => updateSettings("calendarEnabled", !settings.calendarEnabled)}
              />
            )}
            {page === "users" && <UserManagement />}
            {page === "activity_log" && <ActivityLog />}
          </div>
        </main>
      </div>

      {settings.calcEnabled && (
        <CalculatorWidget />
      )}
      {settings.calendarEnabled && (
        <CalendarModal
          open={showCalendar}
          onClose={() => setShowCalendar(false)}
          transactions={transactions}
          onNavigate={navigateToEvent}
        />
      )}

      {fabAction && ["dashboard", "sales", "inventory", "dealers"].includes(page) && (
        <button
          onClick={fabAction}
          className="fixed bottom-10 right-10 z-[40] flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f59e0b] text-white shadow-2xl shadow-[#f59e0b]/40 transition-transform duration-300 hover:scale-110 hover:rotate-90 no-print"
          title="Add Entry"
        >
          <i className="fas fa-plus text-2xl"></i>
        </button>
      )}

      {mobileNavOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 md:hidden" onClick={() => setMobileNavOpen(false)}>
          <div
            className="h-full w-[280px] bg-[#0f172a] p-6 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <UdhIcon />
                <span className="udh-font-heading text-2xl font-bold text-[#f59e0b]">UDH</span>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="text-2xl text-slate-400">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <nav className="space-y-2">
              {navItems
                .filter((item) => {
                  if (item.key === "inventory") return can(user, "reports") || can(user, "limits");
                  if (item.key === "reports") return can(user, "reports");
                  if (item.key === "users") return user?.role === "Technical Team" || user?.role === "Owner";
                  if (item.key === "activity_log") return user?.role === "Technical Team";
                  return true;
                })
                .map((item) => (
                  <button
                    key={item.key}
                    className={`flex w-full items-center gap-5 rounded-2xl px-5 py-4 text-base font-bold transition-all duration-300 ${page === item.key ? "bg-[#f59e0b] text-white shadow-lg shadow-[#f59e0b]/20 translate-x-2" : "text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1"
                      }`}
                    onClick={() => {
                      setPage(item.key);
                      setMobileNavOpen(false);
                    }}
                  >
                    <i className={`${item.icon} text-xl w-6 text-center`}></i>
                    {item.label}
                  </button>
                ))}
            </nav>
            {user && (
              <div className="absolute bottom-10 left-6 right-6">
                <button
                  className="flex w-full items-center justify-between rounded-2xl bg-white/5 p-4 text-red-400 shadow-sm"
                  onClick={logout}
                >
                  <div className="flex items-center gap-3">
                    <i className="fas fa-sign-out-alt"></i>
                    <span className="font-bold">Logout</span>
                  </div>
                  <span className="text-xs text-slate-500">{user.username}</span>
                </button>
              </div>
            )}
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
