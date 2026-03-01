import { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { TransactionModal } from "../components/TransactionModal";
import { Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

type Props = {
  dashMode: "sales" | "buy";
  setPage: (page: any) => void;
  timeLimit: "Daily" | "Weekly" | "Monthly" | "Yearly";
  searchQuery: string;
};

export const Dashboard = ({ dashMode, setPage, timeLimit, searchQuery }: Props) => {
  const { transactions, settings, setFabAction, highlightId, setHighlightId } = useApp();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setFabAction(() => () => setModalOpen(true));
    return () => setFabAction(null);
  }, [setFabAction]);

  useEffect(() => {
    if (highlightId) {
      const el = document.getElementById(`tx-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const timer = setTimeout(() => {
        setHighlightId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, setHighlightId]);
  const filtered = useMemo(
    () => transactions.filter((t) => (dashMode === "buy" ? t.type === "buy" : t.type === "sell")),
    [transactions, dashMode]
  );

  const searched = useMemo(() => {
    if (!searchQuery) return filtered;
    const lowerQ = searchQuery.toLowerCase();
    return filtered.filter(
      (t) =>
        t.name?.toLowerCase().includes(lowerQ) ||
        t.product?.toLowerCase().includes(lowerQ) ||
        t.status?.toLowerCase().includes(lowerQ)
    );
  }, [filtered, searchQuery]);

  const totalTransactions = searched.length;
  // We apply the search filter to the recent list primarily
  const recent = searched.slice(0, Math.max(5, searched.length)); // Show all matched if searching, else top 5
  if (!searchQuery) {
    recent.length = Math.min(recent.length, 5);
  }

  const reminders = searched.filter((t) => t.status === "booked" && t.promiseDate);

  const cutoffDateStr = useMemo(() => {
    const d = new Date();
    if (timeLimit === "Daily") d.setDate(d.getDate() - 7);
    else if (timeLimit === "Weekly") d.setDate(d.getDate() - 30);
    else if (timeLimit === "Monthly") d.setDate(d.getDate() - 365);
    else d.setFullYear(d.getFullYear() - 5);
    return d.toISOString().split("T")[0];
  }, [timeLimit]);

  const filteredByTime = useMemo(
    () => filtered.filter((t) => t.date >= cutoffDateStr),
    [filtered, cutoffDateStr]
  );

  const getGroupKey = (dateStr: string) => {
    const d = new Date(dateStr);

    if (timeLimit === "Daily") {
      // Returns e.g. "Feb 28"
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    if (timeLimit === "Weekly") {
      // Group by week of the year
      const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
      const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      return `Week ${weekNum}, ${d.getFullYear()}`;
    }

    if (timeLimit === "Monthly") {
      // Returns e.g. "Jan 2026"
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    // Yearly
    return `${d.getFullYear()}`;
  };

  const lineData = useMemo(() => {
    // We need to keep raw dates for sorting, then map them to the pretty labels at the end
    const rawByDate: Record<string, number> = {};
    const labelMapping: Record<string, string> = {};

    filteredByTime.forEach((t) => {
      // We use the raw YYYY-MM-DD or similar for proper chronological sorting
      let sortKey = t.date;
      if (timeLimit === "Monthly") sortKey = t.date.substring(0, 7); // YYYY-MM
      if (timeLimit === "Yearly") sortKey = t.date.substring(0, 4); // YYYY
      if (timeLimit === "Weekly") {
        const d = new Date(t.date);
        const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        sortKey = `${d.getFullYear()}-W${weekNum < 10 ? '0' + weekNum : weekNum}`;
      }

      rawByDate[sortKey] = (rawByDate[sortKey] || 0) + (t.amount || 0);
      labelMapping[sortKey] = getGroupKey(t.date);
    });

    const sortedRawKeys = Object.keys(rawByDate).sort();

    return {
      labels: sortedRawKeys.map(k => labelMapping[k]),
      datasets: [
        {
          label: dashMode === "buy" ? "Purchases (₹)" : "Sales (₹)",
          data: sortedRawKeys.map((k) => rawByDate[k]),
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79,70,229,0.2)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [filteredByTime, dashMode, timeLimit]);

  const pieData = useMemo(() => {
    const byProduct: Record<string, number> = {};
    filteredByTime.forEach((t) => {
      byProduct[t.product] = (byProduct[t.product] || 0) + (t.amount || 0);
    });
    const labels = Object.keys(byProduct);
    return {
      labels,
      datasets: [
        {
          data: labels.map((k) => byProduct[k]),
          backgroundColor: ["#10b981", "#4f46e5", "#f97316", "#0ea5e9", "#a855f7"],
        },
      ],
    };
  }, [filteredByTime]);

  const activityTitle = useMemo(() => {
    if (timeLimit === "Daily") return "7 DAYS ACTIVITY";
    if (timeLimit === "Weekly") return "30 DAYS ACTIVITY";
    if (timeLimit === "Monthly") return "12 MONTHS ACTIVITY";
    return "ALL TIME ACTIVITY";
  }, [timeLimit]);

  return (
    <div className="space-y-8">
      {/* STATS GRID */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* TOTAL TRANSACTIONS CARD */}
        <div className="card relative overflow-hidden p-8 shadow-xl">
          <i className="fas fa-exchange-alt absolute -right-4 -top-4 text-7xl text-[#0f172a] opacity-[0.03] rotate-12 pointer-events-none"></i>
          <div className="relative z-10">
            <div className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-[#64748B]">TOTAL TRANSACTIONS</div>
            <div className="udh-font-heading mt-2 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0f172a] tracking-tight">{totalTransactions}</div>
            <div className="mt-4 flex items-center gap-2 text-sm text-[#64748B]">
              <i className="fas fa-chart-line"></i>
              <span>All Time History</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Performance Overview</div>
        <button className="text-slate-400">⌃</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-3 sm:p-8 lg:col-span-2 shadow-xl border-t-2 border-indigo-500/20">
          <div className="flex items-center justify-between mb-6">
            <div className="udh-font-heading text-lg sm:text-xl font-bold text-[#0f172a] uppercase">{activityTitle}</div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dashMode === "buy" ? "Purchases" : "Sales"}</span>
            </div>
          </div>
          <div className="h-[320px] sm:h-80">
            <Line
              data={lineData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#0f172a',
                    titleFont: { size: 12, weight: 'bold' },
                    bodyFont: { size: 12 },
                    padding: 12,
                    cornerRadius: 12,
                    displayColors: false
                  }
                },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: {
                      maxRotation: 0,
                      autoSkip: true,
                      maxTicksLimit: 6,
                      font: { size: 10, weight: 600 },
                      color: '#94a3b8'
                    }
                  },
                  y: {
                    border: { display: false },
                    grid: { color: '#f1f5f9' },
                    ticks: {
                      font: { size: 10, weight: 600 },
                      color: '#94a3b8',
                      callback: (val) => '₹' + Number(val).toLocaleString()
                    }
                  }
                },
                elements: {
                  point: {
                    radius: 0,
                    hoverRadius: 6,
                    backgroundColor: '#4f46e5',
                    borderWidth: 2,
                    borderColor: '#fff'
                  },
                  line: {
                    borderWidth: 3,
                    borderColor: '#4f46e5'
                  }
                }
              }}
            />
          </div>
        </div>
        <div className="card p-3 sm:p-8 shadow-xl border-t-2 border-emerald-500/20">
          <div className="udh-font-heading mb-6 text-lg sm:text-xl font-bold text-[#0f172a]">TOP PRODUCTS</div>
          <div className="h-[300px] sm:h-80">
            <Doughnut
              data={pieData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      boxWidth: 8,
                      usePointStyle: true,
                      padding: 15,
                      font: { size: 10, weight: 'bold' }
                    }
                  }
                },
                cutout: '70%'
              }}
            />
          </div>
        </div>
      </div>

      {settings.calendarEnabled && reminders.length > 0 && (
        <div className="rounded-[24px] border-l-[8px] border-[#f59e0b] bg-white p-8 shadow-xl">
          <div className="udh-font-heading text-2xl font-bold text-[#0f172a] mb-4">Settlement Reminders</div>
          <div className="grid gap-4 md:grid-cols-2">
            {reminders.slice(0, 6).map((t) => (
              <div key={t._id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <div>
                  <div className="text-sm font-bold text-[#0f172a]">{t.name}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">{t.product} • {t.size}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-[#f59e0b]">
                    ₹{Math.max(0, (t.amount || 0) - (t.paidAmount || 0)).toLocaleString()}
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Remaining</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-0 shadow-xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div className="udh-font-heading text-xl font-bold text-[#0f172a]">RECENT TRANSACTIONS</div>
          <button
            className="text-xs font-bold text-[#f59e0b] hover:underline uppercase tracking-widest cursor-pointer"
            onClick={() => setPage("sales")}
          >
            See Full Log
          </button>
        </div>
        <div className="overflow-auto pb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-[2px] text-slate-400 bg-slate-50/50">
                <th className="px-8 py-5">Date</th>
                <th className="px-4 py-5">Type</th>
                <th className="px-4 py-5">Name</th>
                <th className="px-4 py-5">Product</th>
                <th className="px-4 py-5 text-center">Qty</th>
                <th className="px-4 py-5">Amount</th>
                <th className="px-8 py-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="font-medium text-slate-600">
              {recent.map((t) => (
                <tr
                  key={t._id}
                  id={`tx-${t._id}`}
                  className={`border-t border-slate-50 hover:bg-slate-50/80 transition-all ${highlightId === t._id ? "udh-highlight" : ""}`}
                >
                  <td className="px-8 py-4 whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-4 uppercase">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black ${t.type === 'buy' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-bold text-[#0f172a]">{t.name}</td>
                  <td className="px-4 py-4">{t.product}</td>
                  <td className="px-4 py-4 text-center font-bold">{t.qty}</td>
                  <td className="px-4 py-4 font-bold text-[#0f172a]">₹{t.amount?.toLocaleString()}</td>
                  <td className="px-8 py-4 text-right whitespace-nowrap">
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm ${t.status === 'purchased' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-8 py-10 text-center text-slate-400 italic">
                    <i className="fas fa-inbox text-2xl mb-2 block opacity-20"></i>
                    No recent transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        dashMode={dashMode}
      />
    </div>
  );
};
