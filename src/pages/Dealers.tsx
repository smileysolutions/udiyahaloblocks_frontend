import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { apiDelete, apiPost, apiPut } from "../api/client";
import { useApp } from "../context/AppContext";
import type { Trader, Transaction } from "../api/types";
import { can } from "../utils/permissions";
import { Modal } from "../components/Modal";

export const Dealers = ({ dashMode, searchQuery = "" }: { dashMode: "sales" | "buy", searchQuery?: string }) => {
  const { user, traders, transactions, refreshAll, setFabAction } = useApp();

  useEffect(() => {
    setFabAction(() => () => setModalOpen(true));
    return () => setFabAction(null);
  }, [setFabAction]);
  const [editing, setEditing] = useState<Trader | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [portal, setPortal] = useState<Trader | null>(null);
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => {
    let items = traders.filter((t) => (dashMode === "buy" ? t.type === "Dealer" : t.type === "Customer"));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(t =>
        t.name?.toLowerCase().includes(q) ||
        t.contact?.toLowerCase().includes(q) ||
        t.address?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [traders, dashMode, searchQuery]);

  const historyFor = (name: string) => transactions.filter((t) => t.name === name);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const name = String(form.get("name") || "").trim();
    const contact = String(form.get("contact") || "").trim();
    const address = String(form.get("address") || "").trim();
    const gstin = String(form.get("gstin") || "").trim();
    const type = dashMode === "buy" ? "Dealer" : "Customer";

    if (!name) return;
    setSaving(true);
    try {
      if (editing) {
        await apiPut(`/traders/${editing._id}`, { name, contact, address, gstin, type: editing.type });
      } else {
        await apiPost("/traders", { name, contact, address, gstin, type });
      }
      setModalOpen(false);
      setEditing(null);
      await refreshAll();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (trader: Trader) => {
    if (!confirm(`Delete this ${dashMode === "buy" ? "dealer" : "customer"}?`)) return;
    await apiDelete(`/traders/${trader._id}`);
    await refreshAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="udh-font-heading text-2xl font-bold text-slate-800">
            {dashMode === "buy" ? "Dealer Database" : "Customer Database"}
          </h2>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Manage all registered {dashMode === "buy" ? "dealers" : "customers"}
          </div>
        </div>
        {can(user, "add") && (
          <button className="udh-btn-primary flex items-center gap-2" onClick={() => setModalOpen(true)}>
            <i className="fas fa-plus"></i>
            <span>Add {dashMode === "buy" ? "Dealer" : "Customer"}</span>
          </button>
        )}
      </div>

      <div className="udh-card overflow-hidden !p-0 border border-slate-200/60 shadow-sm hidden md:block">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="p-4 pl-6">Name</th>
              <th className="p-4">Phone/Contact</th>
              <th className="p-4">Type</th>
              <th className="p-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((t) => (
              <tr key={t._id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-4 pl-6 font-bold text-slate-700">{t.name}</td>
                <td className="p-4 text-sm text-slate-600 font-medium">{t.contact || "—"}</td>
                <td className="p-4">
                  <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${dashMode === 'buy' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                    {t.type}
                  </span>
                </td>
                <td className="p-4 pr-6 text-right">
                  <div className="flex justify-end gap-3">
                    <button className="text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors" onClick={() => setPortal(t)}>
                      VIEW
                    </button>
                    {can(user, "edit") && (
                      <button className="text-xs font-bold text-emerald-500 hover:text-emerald-700 transition-colors" onClick={() => { setEditing(t); setModalOpen(true); }}>
                        EDIT
                      </button>
                    )}
                    {can(user, "delete") && (
                      <button className="text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors" onClick={() => handleDelete(t)}>
                        DELETE
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="p-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <i className="fas fa-users-slash text-4xl text-slate-200"></i>
                    <p className="text-slate-400 font-medium font-heading">No {dashMode === "buy" ? "dealers" : "customers"} found in the database</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-4 md:hidden">
        {list.map((t) => (
          <div key={t._id} className="udh-card p-4 border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-lg text-slate-800">{t.name}</div>
              <div className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border uppercase ${dashMode === 'buy' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                {t.type}
              </div>
            </div>
            {t.contact && (
              <div className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                <i className="fas fa-phone-alt text-slate-300 text-xs"></i>
                {t.contact}
              </div>
            )}
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button className="flex-1 py-2 text-indigo-600 bg-indigo-50 rounded-xl text-xs font-bold transition-all hover:bg-indigo-100" onClick={() => setPortal(t)}>
                HISTORY
              </button>
              {can(user, "edit") && (
                <button className="p-2 text-emerald-600 bg-emerald-50 rounded-xl transition-all hover:bg-emerald-100" onClick={() => { setEditing(t); setModalOpen(true); }}>
                  <i className="fas fa-edit"></i>
                </button>
              )}
              {can(user, "delete") && (
                <button className="p-2 text-rose-600 bg-rose-50 rounded-xl transition-all hover:bg-rose-100" onClick={() => handleDelete(t)}>
                  <i className="fas fa-trash-alt"></i>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }}>
        <form onSubmit={handleSave} className="space-y-5 p-2">
          <div className="flex items-center justify-between">
            <h3 className="udh-font-heading text-xl font-bold text-slate-800">
              {editing ? "Edit" : "Add"} {dashMode === "buy" ? "Dealer" : "Customer"}
            </h3>
            <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">
              {dashMode === "buy" ? "Dealer" : "Customer"} Name
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-[#f59e0b]/20 outline-none transition-all"
              name="name"
              placeholder={`Enter ${dashMode === "buy" ? "dealer" : "customer"} name`}
              defaultValue={editing?.name || ""}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Contact Details</label>
            <input
              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-[#f59e0b]/20 outline-none transition-all"
              name="contact"
              placeholder="Phone number"
              defaultValue={editing?.contact || ""}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Address</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-[#f59e0b]/20 outline-none transition-all min-h-[80px]"
              name="address"
              placeholder="Enter full address for billing..."
              defaultValue={editing?.address || ""}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">GSTIN (Optional)</label>
            <input
              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-[#f59e0b]/20 outline-none transition-all"
              name="gstin"
              placeholder="GST Registration Number"
              defaultValue={editing?.gstin || ""}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="udh-btn-primary flex items-center gap-2 px-8" disabled={saving}>
              {saving && <i className="fas fa-spinner animate-spin" />}
              {editing ? `Update ${editing.type}` : `Save ${dashMode === "buy" ? "Dealer" : "Customer"}`}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!portal} onClose={() => setPortal(null)} className="max-w-3xl">
        {portal && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <div className="udh-font-heading text-xl font-bold text-slate-800">{portal.name}</div>
                <div className="text-sm font-medium text-slate-500">{portal.contact}</div>
              </div>
              <button onClick={() => setPortal(null)} className="text-slate-400 hover:text-slate-800">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Total Transactions</div>
                <div className="text-2xl font-bold text-slate-800">{historyFor(portal.name).length}</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100">
                <div className="text-[10px] uppercase font-bold text-emerald-600/70 tracking-wider mb-1">Purchases</div>
                <div className="text-2xl font-bold text-emerald-700">
                  {historyFor(portal.name).filter((t) => t.type === "buy").length}
                </div>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4 border border-indigo-100">
                <div className="text-[10px] uppercase font-bold text-indigo-600/70 tracking-wider mb-1">Net Balance</div>
                <div className="text-2xl font-bold text-indigo-700">
                  ₹{historyFor(portal.name).reduce((sum, t) => sum + (t.type === "sell" ? t.amount : -t.amount), 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="max-h-96 overflow-auto rounded-2xl border border-slate-200 shadow-inner">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-slate-50 border-b sticky top-0">
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="p-3 pl-4">Date</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3 pr-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {historyFor(portal.name).map((t: Transaction) => (
                    <tr key={t._id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-3 pl-4 text-slate-500 font-medium">{t.date}</td>
                      <td className="p-3 font-bold text-slate-700">{t.product} <span className="text-[10px] text-slate-400 font-bold ml-1">({t.size})</span></td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${t.type === 'buy' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                          {t.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-600">{t.qty}</td>
                      <td className="p-3 pr-4 text-right font-bold text-slate-800">₹{t.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {historyFor(portal.name).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-400 font-heading">
                        No transaction history available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
