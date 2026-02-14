import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import { can } from "../utils/permissions";

type Props = {
  dashMode: "sales" | "buy";
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

export const Reports = ({ dashMode }: Props) => {
  const { user, transactions, catalog, traders } = useApp();
  const filtered = useMemo(
    () => transactions.filter((t) => (dashMode === "buy" ? t.type === "buy" : t.type === "sell")),
    [transactions, dashMode]
  );

  if (!can(user, "reports")) {
    return <div className="rounded-lg bg-white p-6 shadow">Permission denied.</div>;
  }

  const exportSales = () => {
    const rows = [["Date", "Type", "Customer", "Product", "Size", "Qty", "Amount", "Status"]];
    filtered.forEach((t) =>
      rows.push([t.date, t.type, t.name, t.product, t.size, String(t.qty), String(t.amount), t.status])
    );
    downloadCsv(rows, "Sales_Report.csv");
  };

  const exportStock = () => {
    const rows = [["Product", "Size", "Current Stock"]];
    const stockMap: Record<string, number> = {};
    transactions.forEach((t) => {
      const key = `${t.product}-${t.size}`;
      stockMap[key] = (stockMap[key] || 0) + (t.type === "buy" ? t.qty : -t.qty);
    });
    catalog
      .filter((c) => (dashMode === "buy" ? c.type === "buy" : c.type === "sales"))
      .forEach((c) => {
        rows.push([c.product, c.size, String(stockMap[`${c.product}-${c.size}`] || 0)]);
      });
    downloadCsv(rows, "Inventory_Report.csv");
  };

  const exportCustomers = () => {
    const rows = [["Name", "Contact", "Type"]];
    traders.forEach((t) => rows.push([t.name, t.contact, t.type]));
    downloadCsv(rows, "Customers.csv");
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

      <div className="grid gap-4 md:grid-cols-3">
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
                Download a detailed log of all sales transactions including customer names,
                products, amounts, and settlement status.
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

        <button className="udh-report-card" data-tone="green" onClick={exportCustomers}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M7 7h10v10H7z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 11h6M9 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">Customer Directory</div>
              <div className="mt-1 text-xs text-slate-400">
                Generate a full list of all customers and dealers with their contact
                information and categorized types.
              </div>
              <div className="mt-3 text-xs font-semibold text-emerald-500">CONTACT DATABASE</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
