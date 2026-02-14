import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import type { Transaction } from "../api/types";
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
};

const buildInventoryMap = (transactions: Transaction[]) => {
  const map: Record<string, number> = {};
  transactions.forEach((t) => {
    const key = `${t.product}-${t.size}`;
    if (!map[key]) map[key] = 0;
    map[key] += t.type === "buy" ? t.qty : -t.qty;
  });
  return map;
};

export const Dashboard = ({ dashMode }: Props) => {
  const { transactions, catalog, traders } = useApp();
  const filtered = useMemo(
    () => transactions.filter((t) => (dashMode === "buy" ? t.type === "buy" : t.type === "sell")),
    [transactions, dashMode]
  );

  const inventoryMap = useMemo(() => buildInventoryMap(transactions), [transactions]);

  const totalTransactions = transactions.length;
  const stockValue = useMemo(() => {
    let total = 0;
    const priceMap = new Map<string, number>();
    catalog.forEach((item) => {
      priceMap.set(`${item.product}-${item.size}`, item.price);
    });
    Object.entries(inventoryMap).forEach(([key, qty]) => {
      if (qty > 0) {
        const price = priceMap.get(key) || 0;
        total += price * qty;
      }
    });
    return total;
  }, [inventoryMap, catalog]);

  const recent = filtered.slice(0, 5);
  const traderMap = useMemo(() => new Map(traders.map((t) => [t.name, t.contact])), [traders]);
  const reminders = filtered.filter((t) => t.status === "booked" && t.promiseDate);

  const lineData = useMemo(() => {
    const byDate: Record<string, number> = {};
    filtered.forEach((t) => {
      byDate[t.date] = (byDate[t.date] || 0) + (t.amount || 0);
    });
    const labels = Object.keys(byDate).sort();
    return {
      labels,
      datasets: [
        {
          label: dashMode === "buy" ? "Purchases (₹)" : "Sales (₹)",
          data: labels.map((d) => byDate[d]),
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79,70,229,0.2)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [filtered, dashMode]);

  const pieData = useMemo(() => {
    const byProduct: Record<string, number> = {};
    filtered.forEach((t) => {
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
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="udh-card p-6">
          <div className="text-xs uppercase tracking-wide text-slate-400">Total Transactions</div>
          <div className="mt-2 text-3xl font-bold text-slate-800">{totalTransactions}</div>
          <div className="mt-2 text-xs text-slate-400">All Time</div>
        </div>
        <div className="udh-card p-6">
          <div className="text-xs uppercase tracking-wide text-slate-400">Stock Value (Est)</div>
          <div className="mt-2 text-3xl font-bold text-slate-800">₹{stockValue.toLocaleString()}</div>
          <button className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Recalculate Value
          </button>
        </div>
      </div>

      <div className="udh-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-semibold">Current Inventory</div>
          <button className="text-xs font-semibold text-orange-500">View All →</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {catalog
            .filter((c) => (dashMode === "buy" ? c.type === "buy" : c.type === "sales"))
            .map((item) => {
              const key = `${item.product}-${item.size}`;
              const qty = inventoryMap[key] || 0;
              return (
                <div key={item._id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                  <div className="text-xs font-semibold text-slate-500">{item.product.toUpperCase()}</div>
                  <div className="text-2xl font-bold text-orange-500">{qty}</div>
                  <div className="text-xs text-slate-400">{item.size}</div>
                </div>
              );
            })}
          {catalog.filter((c) => (dashMode === "buy" ? c.type === "buy" : c.type === "sales")).length === 0 && (
            <div className="col-span-full rounded-xl border border-slate-100 bg-slate-50/60 py-6 text-center text-sm text-slate-400">
              No active stock items for this mode.
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Performance Overview</div>
        <button className="text-slate-400">⌃</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="udh-card p-6 lg:col-span-2">
          <div className="mb-4 font-semibold">30 Days Activity</div>
          <div className="h-64">
            <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
        <div className="udh-card p-6">
          <div className="mb-4 font-semibold">Top Products</div>
          <div className="h-64">
            <Doughnut data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {reminders.length > 0 && (
        <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50 p-4">
          <div className="font-semibold text-amber-700">Settlement Reminders</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {reminders.slice(0, 6).map((t) => (
              <div key={t._id} className="rounded-lg bg-white p-3 shadow-sm">
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-slate-500">
                  {t.product} ({t.size})
                </div>
                <div className="text-sm font-semibold text-amber-700">
                  Due: ₹{Math.max(0, (t.amount || 0) - (t.paidAmount || 0)).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="udh-card p-6">
        <div className="mb-4 font-semibold">Recent Transactions</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400">
                <th>Date</th>
                <th>Type</th>
                <th>Name</th>
                <th>Number</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t._id} className="border-t">
                  <td className="py-2">{t.date}</td>
                  <td className="py-2">{t.type}</td>
                  <td className="py-2">{t.name}</td>
                  <td className="py-2">{traderMap.get(t.name) || "-"}</td>
                  <td className="py-2">{t.product}</td>
                  <td className="py-2">{t.qty}</td>
                  <td className="py-2">₹{t.amount?.toLocaleString()}</td>
                  <td className="py-2">{t.status}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-500">
                    No recent transactions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
