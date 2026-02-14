import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { apiDelete, apiPost, apiPut } from "../api/client";
import { useApp } from "../context/AppContext";
import type { Trader, Transaction } from "../api/types";
import { can } from "../utils/permissions";
import { Modal } from "../components/Modal";

type Props = {
  dashMode: "sales" | "buy";
};

export const Customers = ({ dashMode }: Props) => {
  const { user, traders, transactions, refreshAll } = useApp();
  const [editing, setEditing] = useState<Trader | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [portal, setPortal] = useState<Trader | null>(null);
  const [saving, setSaving] = useState(false);

  const list = useMemo(
    () => traders.filter((t) => (dashMode === "buy" ? t.type === "Dealer" : t.type === "Customer")),
    [traders, dashMode]
  );

  const historyFor = (name: string) => transactions.filter((t) => t.name === name);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const name = String(form.get("name") || "").trim();
    const contact = String(form.get("contact") || "").trim();
    const type = String(form.get("type") || (dashMode === "buy" ? "Dealer" : "Customer"));

    if (!name) return;
    setSaving(true);
    try {
      if (editing) {
        await apiPut(`/traders/${editing._id}`, { name, contact, type });
      } else {
        await apiPost("/traders", { name, contact, type });
      }
      setModalOpen(false);
      setEditing(null);
      await refreshAll();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (trader: Trader) => {
    if (!confirm("Delete this customer?")) return;
    await apiDelete(`/traders/${trader._id}`);
    await refreshAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Customer Database</h2>
          <div className="text-xs text-slate-400">Customer Database</div>
        </div>
        {can(user, "add") && (
          <button className="udh-btn-primary flex items-center gap-2" onClick={() => setModalOpen(true)}>
            <span className="text-sm">Add {dashMode === "buy" ? "Dealer" : "Customer"}</span>
          </button>
        )}
      </div>

      <div className="udh-card overflow-auto hidden md:block">
        <table className="udh-table">
          <thead>
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Phone/Contact</th>
              <th className="p-3">Type</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t._id} className="border-t">
                <td className="p-3 font-semibold">{t.name}</td>
                <td className="p-3">{t.contact}</td>
                <td className="p-3">{t.type}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="text-indigo-600" onClick={() => setPortal(t)}>
                      View
                    </button>
                    {can(user, "edit") && (
                      <button className="text-emerald-600" onClick={() => { setEditing(t); setModalOpen(true); }}>
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
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="p-10 text-center text-slate-400">
                  <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-slate-100 p-2">
                    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full text-slate-300">
                      <path d="M7 14a4 4 0 1 1 8 0v4H7v-4Z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="11" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M18 9h4m-2-2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  No {dashMode === "buy" ? "Dealers" : "Customers"} Found
                  <div className="text-xs text-slate-400">Add a new dealer to manage contacts.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-4 md:hidden">
        {list.map((t) => (
          <div key={t._id} className="udh-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-lg text-slate-800">{t.name}</div>
              <div className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {t.type}
              </div>
            </div>
            {t.contact && (
              <div className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t.contact}
              </div>
            )}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button className="flex-1 py-2 text-indigo-600 bg-indigo-50 rounded-lg text-sm font-medium" onClick={() => setPortal(t)}>
                History
              </button>
              {can(user, "edit") && (
                <button className="p-2 text-emerald-600 bg-emerald-50 rounded-lg" onClick={() => { setEditing(t); setModalOpen(true); }}>
                  Edit
                </button>
              )}
              {can(user, "delete") && (
                <button className="p-2 text-rose-600 bg-rose-50 rounded-lg" onClick={() => handleDelete(t)}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="text-center text-slate-400 py-10">
            No {dashMode === "buy" ? "Dealers" : "Customers"} Found
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{editing ? "Edit" : "Add"} {dashMode === "buy" ? "Dealer" : "Customer"}</h3>
            <button type="button" onClick={() => setModalOpen(false)}>✕</button>
          </div>
          <input
            className="w-full rounded-lg border p-2"
            name="name"
            placeholder="Name"
            defaultValue={editing?.name || ""}
            required
          />
          <input
            className="w-full rounded-lg border p-2"
            name="contact"
            placeholder="Contact"
            defaultValue={editing?.contact || ""}
          />
          <select className="w-full rounded-lg border p-2" name="type" defaultValue={editing?.type || (dashMode === "buy" ? "Dealer" : "Customer")}>
            <option value="Customer">Customer</option>
            <option value="Dealer">Dealer</option>
          </select>
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-lg border px-4 py-2" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="udh-btn-blue flex items-center gap-2" disabled={saving}>
              {saving && <span className="udh-spinner" />}
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!portal} onClose={() => setPortal(null)} className="max-w-3xl">
        {portal && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{portal.name}</div>
                <div className="text-sm text-slate-500">{portal.contact}</div>
              </div>
              <button onClick={() => setPortal(null)}>✕</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Total Orders</div>
                <div className="text-lg font-semibold">{historyFor(portal.name).length}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Stock In</div>
                <div className="text-lg font-semibold">
                  {historyFor(portal.name).filter((t) => t.type === "buy").length}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Balance</div>
                <div className="text-lg font-semibold">
                  ₹{historyFor(portal.name).reduce((sum, t) => sum + (t.type === "sell" ? t.amount : -t.amount), 0).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="max-h-96 overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-400">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Product</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {historyFor(portal.name).map((t: Transaction) => (
                    <tr key={t._id} className="border-t">
                      <td className="p-2">{t.date}</td>
                      <td className="p-2">{t.product}</td>
                      <td className="p-2">{t.type}</td>
                      <td className="p-2">{t.qty}</td>
                      <td className="p-2">₹{t.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {historyFor(portal.name).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500">
                        No transactions
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
