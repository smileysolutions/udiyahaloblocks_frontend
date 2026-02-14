import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { apiDelete, apiPost, apiPut } from "../api/client";
import { useApp } from "../context/AppContext";
import type { Transaction } from "../api/types";
import { can } from "../utils/permissions";
import { Modal } from "../components/Modal";

type Props = {
  dashMode: "sales" | "buy";
};

const emptyTx: Partial<Transaction> = {
  date: new Date().toISOString().split("T")[0],
  qty: 1,
  type: "sell",
  status: "purchased",
  paymentMethod: "Cash",
};

export const Transactions = ({ dashMode }: Props) => {
  const { user, transactions, traders, catalog, refreshAll } = useApp();
  const [filters, setFilters] = useState({
    date: "",
    name: "",
    product: "all",
    size: "",
    status: "all",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<Partial<Transaction>>(emptyTx);
  const [showPhone, setShowPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [printTx, setPrintTx] = useState<Transaction | null>(null);
  const [printFormat, setPrintFormat] = useState<"bill" | "invoice">("bill");

  const catalogForMode = catalog.filter((c) => (dashMode === "buy" ? c.type === "buy" : c.type === "sales"));
  const products = Array.from(new Set(catalogForMode.map((c) => c.product)));

  const filtered = useMemo(() => {
    const list = transactions.filter((t) => (dashMode === "buy" ? t.type === "buy" : t.type === "sell"));
    return list
      .filter((t) => (filters.date ? t.date === filters.date : true))
      .filter((t) => (filters.name ? t.name.toLowerCase().includes(filters.name.toLowerCase()) : true))
      .filter((t) => (filters.product === "all" ? true : t.product === filters.product))
      .filter((t) => (filters.size ? t.size.toLowerCase().includes(filters.size.toLowerCase()) : true))
      .filter((t) => (filters.status === "all" ? true : t.status === filters.status))
      .slice(0, 100);
  }, [transactions, filters, dashMode]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyTx, type: dashMode === "buy" ? "buy" : "sell" });
    setShowPhone(false);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setForm(tx);
    setShowPhone(false);
    setError("");
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const payload = {
      ...form,
      name: (form.name || "").trim(),
      qty: Number(form.qty || 0),
      amount: Number(form.amount || 0),
      paidAmount: Number(form.paidAmount || 0),
    };

    if (payload.status === "purchased") {
      payload.paidAmount = payload.amount;
    }

    if (!payload.name) {
      setError("Customer/Dealer name is required.");
      return;
    }
    if (!payload.product) {
      setError("Please select a product.");
      return;
    }
    if (!payload.size) {
      setError("Please select a size.");
      return;
    }
    if (!payload.qty || payload.qty <= 0) {
      setError("Quantity must be at least 1.");
      return;
    }

    const existingTrader = traders.find((t) => t.name.toLowerCase() === payload.name?.toLowerCase());
    if (!existingTrader && !phone) {
      setShowPhone(true);
      setError("Contact number is required for new customers.");
      return;
    }

    try {
      if (!existingTrader && phone) {
        await apiPost("/traders", {
          name: payload.name,
          contact: phone,
          type: payload.type === "buy" ? "Dealer" : "Customer",
        });
      }

      if (editing) {
        await apiPut(`/transactions/${editing._id}`, payload);
      } else {
        await apiPost("/transactions", payload);
      }
      setModalOpen(false);
      setPhone("");
      await refreshAll();
    } catch (err) {
      setError("Save failed. Please check required fields and try again.");
    }
  };

  const handleDelete = async (tx: Transaction) => {
    if (!confirm("Delete this transaction?")) return;
    await apiDelete(`/transactions/${tx._id}`);
    await refreshAll();
  };

  const autoCalculateTotal = (nextProduct?: string, nextSize?: string, nextQty?: number) => {
    const product = nextProduct ?? form.product;
    const size = nextSize ?? form.size;
    const qty = Number(nextQty ?? form.qty ?? 0);
    const item = catalogForMode.find((c) => c.product === product && c.size === size);
    if (item && qty > 0) {
      const total = item.price * qty;
      setForm((prev) => ({ ...prev, amount: total, paidAmount: prev.status === "purchased" ? total : prev.paidAmount }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Transaction Log</h2>
        {can(user, "add") && (
          <button className="udh-btn-primary" onClick={openNew}>
            Add Entry
          </button>
        )}
      </div>

      <div className="udh-card p-4">
        <div className="grid gap-3 md:grid-cols-8">
          <div>
            <div className="mb-1 text-[11px] font-semibold text-slate-400">Date</div>
            <input
              className="udh-filter"
              type="date"
              value={filters.date}
              onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-slate-400">Customer/Dealer</div>
            <input
              className="udh-filter"
              placeholder="Filter..."
              value={filters.name}
              onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-slate-400">Product</div>
            <select
              className="udh-filter"
              value={filters.product}
              onChange={(e) => setFilters((f) => ({ ...f, product: e.target.value }))}
            >
              <option value="all">All</option>
              {products.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-slate-400">Size</div>
            <input
              className="udh-filter"
              placeholder="Filter..."
              value={filters.size}
              onChange={(e) => setFilters((f) => ({ ...f, size: e.target.value }))}
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-slate-400">Qty</div>
            <input
              className="udh-filter"
              placeholder="Qty"
              type="number"
              min={0}
              value=""
              onChange={() => undefined}
              disabled
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-slate-400">Amount</div>
            <input className="udh-filter" placeholder="Amount" type="number" disabled />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-slate-400">Status</div>
            <select
              className="udh-filter"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="all">All</option>
              <option value="purchased">Purchased</option>
              <option value="booked">Booked</option>
              <option value="returned">Returned</option>
            </select>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-slate-400">Action</div>
            <div className="h-9 rounded-xl border border-dashed border-slate-200" />
          </div>
        </div>

        <div className="mt-4 overflow-auto hidden md:block">
          <table className="udh-table">
            <thead>
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Name</th>
                <th className="p-3">Product</th>
                <th className="p-3">Size</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t._id} className="border-t">
                  <td className="p-3">{t.date}</td>
                  <td className="p-3 font-semibold">{t.name}</td>
                  <td className="p-3">{t.product}</td>
                  <td className="p-3">{t.size}</td>
                  <td className="p-3">{t.qty}</td>
                  <td className="p-3">
                    <div className="font-semibold">₹{t.amount.toLocaleString()}</div>
                    <div className="text-xs text-slate-400">{t.paymentMethod}</div>
                  </td>
                  <td className="p-3">{t.status}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="text-indigo-600" onClick={() => setPrintTx(t)}>
                        Print
                      </button>
                      {can(user, "edit") && (
                        <button className="text-emerald-600" onClick={() => openEdit(t)}>
                          Edit
                        </button>
                      )}
                      {can(user, "delete") && (
                        <button className="text-rose-600" onClick={() => handleDelete(t)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="mt-4 space-y-4 md:hidden">
          {filtered.map((t) => (
            <div key={t._id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-500">{t.date}</div>
                <div className={`text-xs px-2 py-0.5 rounded-full ${t.status === "purchased" ? "bg-emerald-100 text-emerald-700" :
                  t.status === "returned" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                  }`}>
                  {t.status}
                </div>
              </div>
              <div className="mb-1 text-lg font-semibold text-slate-800">{t.name}</div>
              <div className="mb-3 text-sm text-slate-600">
                {t.product} ({t.size}) x {t.qty}
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <div>
                  <div className="text-lg font-bold text-slate-900">₹{t.amount.toLocaleString()}</div>
                  <div className="text-xs text-slate-400">{t.paymentMethod}</div>
                </div>
                <div className="flex gap-3">
                  <button className="p-2 text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-sm" onClick={() => setPrintTx(t)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <path d="M6 14h12v8H6z" />
                    </svg>
                  </button>
                  {can(user, "edit") && (
                    <button className="p-2 text-emerald-600 bg-white border border-slate-200 rounded-lg shadow-sm" onClick={() => openEdit(t)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}
                  {can(user, "delete") && (
                    <button className="p-2 text-rose-600 bg-white border border-slate-200 rounded-lg shadow-sm" onClick={() => handleDelete(t)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-slate-400 py-8">
              No transactions found.
            </div>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} className="max-w-lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editing ? "Edit Transaction" : dashMode === "buy" ? "Purchase Entry" : "Sales Entry"}
            </h3>
            <button type="button" onClick={() => setModalOpen(false)}>
              ✕
            </button>
          </div>
          <div>
            <label className="text-xs text-slate-500">Date</label>
            <input
              className="udh-input"
              type="date"
              value={form.date || ""}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">{dashMode === "buy" ? "Dealer" : "Customer"} *</label>
            <input
              className="udh-input"
              value={form.name || ""}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                setShowPhone(!traders.some((t) => t.name === e.target.value));
              }}
              list="traders"
              placeholder="Select or type customer..."
              required
            />
            <datalist id="traders">
              {traders.map((t) => (
                <option key={t._id} value={t.name} />
              ))}
            </datalist>
          </div>

          {showPhone && (
            <div>
              <label className="text-xs text-slate-500">Contact Number</label>
              <input className="udh-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          )}

          <div>
            <label className="text-xs text-slate-500">Product</label>
            <select
              className="udh-select"
              value={form.product || ""}
              onChange={(e) => {
                const product = e.target.value;
                setForm((f) => ({ ...f, product }));
                if (!product) setForm((f) => ({ ...f, size: "" }));
                autoCalculateTotal(product);
              }}
              required
            >
              <option value="">Select</option>
              {products.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Size</label>
            <select
              className="udh-select"
              value={form.size || ""}
              onChange={(e) => {
                const size = e.target.value;
                setForm((f) => ({ ...f, size }));
                autoCalculateTotal(undefined, size);
              }}
              required
            >
              <option value="">Select</option>
              {catalogForMode
                .filter((c) => c.product === form.product)
                .map((c) => (
                  <option key={c._id} value={c.size}>
                    {c.size}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Qty (Units)</label>
            <input
              className="udh-input"
              type="number"
              min={1}
              value={form.qty || 1}
              onChange={(e) => {
                const qty = Number(e.target.value);
                setForm((f) => ({ ...f, qty }));
                autoCalculateTotal(undefined, undefined, qty);
              }}
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">Status</label>
            <select
              className="udh-select"
              value={form.status || "purchased"}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Transaction["status"] }))}
            >
              <option value="purchased">Purchased (Full Settlement)</option>
              <option value="booked">Booked</option>
              <option value="returned">Returned</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Payment Method</label>
            <select
              className="udh-select"
              value={form.paymentMethod || "Cash"}
              onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / PhonePe</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">UPI Transaction ID</label>
            <input
              className="udh-input"
              value={form.upiId || ""}
              onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))}
              disabled={form.paymentMethod !== "UPI"}
            />
          </div>

          <div>
            <label className="text-xs text-slate-500">Total Amount (₹)</label>
            <input
              className="udh-input"
              type="number"
              value={form.amount || 0}
              onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Paid Now</label>
            <input
              className="udh-input"
              type="number"
              value={form.paidAmount || 0}
              onChange={(e) => setForm((f) => ({ ...f, paidAmount: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Promise Date</label>
            <input
              className="udh-input"
              type="date"
              value={form.promiseDate || ""}
              onChange={(e) => setForm((f) => ({ ...f, promiseDate: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3">
            {error && (
              <div className="mr-auto udh-error" title={error}>
                {error}
              </div>
            )}
            <button type="button" className="udh-btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="udh-btn-primary px-6 py-3">
              Save Record
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!printTx} onClose={() => setPrintTx(null)} className="max-w-2xl">
        {printTx && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-indigo-600">UDH</div>
                <div className="text-xs text-slate-500">Print Preview</div>
              </div>
              <div className="flex gap-2">
                <button
                  className={`rounded-lg px-3 py-1 text-sm ${printFormat === "bill" ? "bg-indigo-600 text-white" : "border"}`}
                  onClick={() => setPrintFormat("bill")}
                >
                  Bill
                </button>
                <button
                  className={`rounded-lg px-3 py-1 text-sm ${printFormat === "invoice" ? "bg-indigo-600 text-white" : "border"}`}
                  onClick={() => setPrintFormat("invoice")}
                >
                  A4 Invoice
                </button>
              </div>
            </div>
            {printFormat === "bill" ? (
              <div className="rounded-lg border p-4 text-sm">
                <div>Receipt #: {printTx._id.slice(-6)}</div>
                <div>Date: {printTx.date}</div>
                <div>Customer: {printTx.name}</div>
                <div className="mt-3 border-t pt-3">
                  <div>Product: {printTx.product} ({printTx.size})</div>
                  <div>Qty: {printTx.qty}</div>
                  <div>Amount: ₹{printTx.amount.toLocaleString()}</div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border p-6 text-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">Invoice</div>
                    <div className="text-xs text-slate-500">#{printTx._id.slice(-6)}</div>
                  </div>
                  <div className="text-right text-xs text-slate-500">Date: {printTx.date}</div>
                </div>
                <div className="mb-4 text-sm">
                  <div className="font-semibold">Bill To</div>
                  <div>{printTx.name}</div>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-slate-400">
                    <tr>
                      <th>Description</th>
                      <th className="text-right">Rate</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="py-2">{printTx.product} ({printTx.size})</td>
                      <td className="py-2 text-right">{(printTx.amount / printTx.qty).toFixed(2)}</td>
                      <td className="py-2 text-right">{printTx.qty}</td>
                      <td className="py-2 text-right">₹{printTx.amount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-4 text-right font-semibold">Total: ₹{printTx.amount.toLocaleString()}</div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button className="rounded-lg border px-3 py-2" onClick={() => setPrintTx(null)}>
                Close
              </button>
              <button
                className="rounded-lg bg-indigo-600 px-3 py-2 text-white"
                onClick={() => window.print()}
              >
                Print
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
