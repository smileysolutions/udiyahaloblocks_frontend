import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import { can } from "../utils/permissions";

type Props = {
  dashMode: "sales" | "buy";
  searchQuery?: string;
};

const downloadCsv = (rows: string[][], filename: string) => {
  const content = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const Reports = ({ dashMode, searchQuery = "" }: Props) => {
  const { user, transactions, catalog, traders } = useApp();
  const filtered = useMemo(() => {
    let list = transactions.filter((t) => (dashMode === "buy" ? t.type === "buy" : t.type === "sell"));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.name?.toLowerCase().includes(q) ||
        t.product?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, dashMode, searchQuery]);

  if (!can(user, "reports")) {
    return <div className="rounded-lg bg-white p-6 shadow">Permission denied.</div>;
  }

  const exportSales = () => {
    const rows = [["Date", "Type", "Dealer", "Product", "Size", "Qty", "Amount", "Status"]];
    filtered.forEach((t) =>
      rows.push([t.date, t.type, t.name, t.product, t.size, String(t.qty), String(t.amount), t.status])
    );
    downloadCsv(rows, "Dealer_Transactions_Report.csv");
  };

  const exportStock = () => {
    const rows = [["Product", "Size", "Current Stock"]];
    const stockMap: Record<string, number> = {};
    transactions.forEach((t) => {
      const key = `${t.product}-${t.size}`;
      stockMap[key] = (stockMap[key] || 0) + (t.type === "buy" ? t.qty : -t.qty);
    });
    let items = catalog.filter((c) => (dashMode === "buy" ? c.type === "buy" : c.type === "sales"));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(c =>
        c.product?.toLowerCase().includes(q) ||
        c.size?.toLowerCase().includes(q)
      );
    }

    items.forEach((c) => {
      rows.push([c.product, c.size, String(Math.max(0, stockMap[`${c.product}-${c.size}`] || 0))]);
    });
    downloadCsv(rows, "Inventory_Report.csv");
  };

  const exportDealers = () => {
    const rows = [["Name", "Contact", "Type"]];
    let items = traders;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(t =>
        t.name?.toLowerCase().includes(q) ||
        t.contact?.toLowerCase().includes(q)
      );
    }
    items.forEach((t) => rows.push([t.name, t.contact, t.type]));
    downloadCsv(rows, "Dealer_Directory.csv");
  };

  const exportOutstanding = () => {
    const rows = [["Date", "Dealer", "Product", "Status", "Total Amount", "Paid Amount", "Pending Balance"]];
    const pendingList = filtered.filter(t => t.status === "booked" && (t.amount || 0) > (t.paidAmount || 0));
    pendingList.forEach((t) => {
      const remaining = (t.amount || 0) - (t.paidAmount || 0);
      rows.push([t.date, t.name, t.product, t.status, String(t.amount), String(t.paidAmount), String(remaining)]);
    });
    downloadCsv(rows, "Outstanding_Settlements_Report.csv");
  };

  const exportActivity = async () => {
    try {
      const { apiGet } = await import("../api/client");
      const data = await apiGet<{ logs: any[] }>("/activity");
      const rows = [["Date", "Time", "User", "Role", "Action", "IP Address"]];
      data.logs.forEach(log => {
        const d = new Date(log.timestamp);
        rows.push([
          d.toLocaleDateString(),
          d.toLocaleTimeString(),
          log.user,
          log.role,
          log.action,
          log.ip
        ]);
      });
      downloadCsv(rows, "System_Activity_Log.csv");
    } catch (err) {
      console.error("Failed to export activity logs", err);
      alert("Failed to export activity logs.");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="udh-section-title">Reports & Analytics</h2>
        <div className="text-sm text-slate-500">Data Intelligence & Reports</div>
        <div className="udh-muted">
          Generate and export comprehensive datasets for analysis or accounting.
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <button className="udh-report-card" data-tone="orange" onClick={exportSales}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">Sales Record Export</div>
              <div className="mt-1 text-xs text-slate-400">
                Download a detailed log of all transactions including dealer names,
                Products, amounts, and settlement status.
              </div>
              <div className="mt-3 text-xs font-semibold text-orange-500">CSV / EXCEL FORMAT</div>
            </div>
          </div>
        </button>

        <button className="udh-report-card" data-tone="blue" onClick={exportStock}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M5 7h14M5 17h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">Inventory Valuation</div>
              <div className="mt-1 text-xs text-slate-400">
                Export current stock balances across all product categories with their
                respective sizes and prices.
              </div>
              <div className="mt-3 text-xs font-semibold text-blue-500">CURRENT SNAPSHOT</div>
            </div>
          </div>
        </button>

        <button className="udh-report-card" data-tone="green" onClick={exportDealers}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M7 7h10v10H7z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 11h6M9 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">Dealer Directory</div>
              <div className="mt-1 text-xs text-slate-400">
                Generate a full list of all dealers with their contact
                information and categorized types.
              </div>
              <div className="mt-3 text-xs font-semibold text-emerald-500">CONTACT DATABASE</div>
            </div>
          </div>
        </button>
        <button className="udh-report-card" data-tone="rose" onClick={exportOutstanding}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">Outstanding Settlements</div>
              <div className="mt-1 text-xs text-slate-400">
                Download a report containing all "Booked" transactions showing
                total amounts and the pending unpaid balances per dealer.
              </div>
              <div className="mt-3 text-xs font-semibold text-rose-500">PENDING DUES</div>
            </div>
          </div>
        </button>

        {user?.role === "Technical Team" && (
          <button className="udh-report-card" data-tone="slate" onClick={exportActivity}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Activity Logs Export</div>
                <div className="mt-1 text-xs text-slate-400">
                  Securely download the entire application activity logs including
                  login occurrences, profile creations, IP logs and edits.
                </div>
                <div className="mt-3 text-xs font-semibold text-slate-500">SECURITY AUDIT</div>
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
