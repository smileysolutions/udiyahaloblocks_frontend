import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { Modal } from "../components/Modal";
import { can } from "../utils/permissions";
import { apiPost, apiPut } from "../api/client";
import type { CatalogItem, Transaction } from "../api/types";

type Props = {
  dashMode: "sales" | "buy";
};

const buildInventory = (transactions: Transaction[]) => {
  const map: Record<string, number> = {};
  transactions.forEach((t) => {
    const key = `${t.product}-${t.size}`;
    map[key] = (map[key] || 0) + (t.type === "buy" ? t.qty : -t.qty);
  });
  return map;
};

export const Inventory = ({ dashMode }: Props) => {
  const { user, transactions, catalog, refreshAll } = useApp();
  const [ledgerItem, setLedgerItem] = useState<CatalogItem | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [limitItem, setLimitItem] = useState<CatalogItem | null>(null);
  const [limitValue, setLimitValue] = useState("");
  const [newItem, setNewItem] = useState({ product: "", size: "", price: "", limit: "" });
  const [savingAdd, setSavingAdd] = useState(false);
  const [savingLimit, setSavingLimit] = useState(false);
  const inventoryMap = useMemo(() => buildInventory(transactions), [transactions]);
  const items = catalog.filter((c) => (dashMode === "buy" ? c.type === "buy" : c.type === "sales"));

  const historyForItem = (item: CatalogItem) =>
    transactions
      .filter((t) => t.product === item.product && t.size === item.size)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const openLimit = (item: CatalogItem) => {
    setLimitItem(item);
    setLimitValue(String(item.limit ?? 50));
  };

  const handleSaveLimit = async () => {
    if (!limitItem) return;
    const limit = Number(limitValue);
    if (Number.isNaN(limit)) return;
    setSavingLimit(true);
    try {
      await apiPut(`/catalog/${limitItem._id}`, { limit });
      setLimitItem(null);
      await refreshAll();
    } finally {
      setSavingLimit(false);
    }
  };

  const handleAddItem = async () => {
    const payload = {
      product: newItem.product.trim(),
      size: newItem.size.trim(),
      price: Number(newItem.price || 0),
      limit: newItem.limit ? Number(newItem.limit) : undefined,
      type: dashMode === "buy" ? "buy" : "sales",
    };
    if (!payload.product || !payload.size) return;
    setSavingAdd(true);
    try {
      await apiPost("/catalog", payload);
      setAddModalOpen(false);
      setNewItem({ product: "", size: "", price: "", limit: "" });
      await refreshAll();
    } finally {
      setSavingAdd(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Stock Inventory</h2>
        <div className="text-sm font-semibold text-slate-700">Current Stock Levels</div>
      </div>

      <div className="udh-card p-5">
        <div className="grid gap-4 md:grid-cols-5">
          <button
            className="flex h-40 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm disabled:opacity-60"
            onClick={() => can(user, "limits") && setAddModalOpen(true)}
            disabled={!can(user, "limits")}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white">
              +
            </div>
            <div className="mt-3 text-xs font-semibold text-slate-600">Add</div>
            <div className="text-xs font-semibold text-slate-600">New</div>
            <div className="text-xs font-semibold text-slate-600">Product</div>
          </button>
          <div className="md:col-span-4">
            {items.length === 0 && (
              <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-sm text-slate-400">
                No stock items yet.
              </div>
            )}
            {items.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => {
                  const key = `${item.product}-${item.size}`;
                  const qty = inventoryMap[key] || 0;
                  const isLow = item.limit != null && qty < item.limit;
                  return (
                    <div
                      key={item._id}
                      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                      onClick={() => setLedgerItem(item)}
                    >
                      <div className="text-xs uppercase text-slate-400">{item.product}</div>
                      <div className={`text-3xl font-bold ${qty <= 0 ? "text-rose-600" : "text-orange-500"}`}>{qty}</div>
                      <div className="text-xs text-slate-400">{item.size}</div>
                      {isLow && <div className="mt-2 text-xs font-semibold text-amber-600">Low stock</div>}
                      {can(user, "limits") && (
                        <button
                          className="mt-2 text-xs text-orange-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLimit(item);
                          }}
                        >
                          Set limit
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={!!ledgerItem} onClose={() => setLedgerItem(null)} className="max-w-3xl">
        {ledgerItem && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{ledgerItem.product}</div>
                <div className="text-sm text-slate-500">{ledgerItem.size}</div>
              </div>
              <button onClick={() => setLedgerItem(null)}>✕</button>
            </div>
            <div className="max-h-96 overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-400">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2">Running Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let running = 0;
                    return historyForItem(ledgerItem).map((t) => {
                      running += t.type === "buy" ? t.qty : -t.qty;
                      return (
                        <tr key={t._id} className="border-t">
                          <td className="p-2">{t.date}</td>
                          <td className="p-2">{t.type}</td>
                          <td className="p-2">{t.name}</td>
                          <td className="p-2">{t.type === "buy" ? `+${t.qty}` : `-${t.qty}`}</td>
                          <td className="p-2 font-semibold">{running}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} className="max-w-lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Add New Product</h3>
            <button onClick={() => setAddModalOpen(false)}>✕</button>
          </div>
          <div className="grid gap-3">
            <input
              className="udh-input"
              placeholder="Product"
              value={newItem.product}
              onChange={(e) => setNewItem((n) => ({ ...n, product: e.target.value }))}
            />
            <input
              className="udh-input"
              placeholder="Size"
              value={newItem.size}
              onChange={(e) => setNewItem((n) => ({ ...n, size: e.target.value }))}
            />
            <input
              className="udh-input"
              type="number"
              placeholder="Price"
              value={newItem.price}
              onChange={(e) => setNewItem((n) => ({ ...n, price: e.target.value }))}
            />
            <input
              className="udh-input"
              type="number"
              placeholder="Low Stock Limit (optional)"
              value={newItem.limit}
              onChange={(e) => setNewItem((n) => ({ ...n, limit: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button className="udh-btn-ghost" onClick={() => setAddModalOpen(false)}>
              Cancel
            </button>
            <button className="udh-btn-primary flex items-center gap-2" onClick={handleAddItem} disabled={savingAdd}>
              {savingAdd && <span className="udh-spinner" />}
              Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!limitItem} onClose={() => setLimitItem(null)} className="max-w-sm">
        {limitItem && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Set Stock Limit</h3>
              <button onClick={() => setLimitItem(null)}>✕</button>
            </div>
            <div className="text-sm text-slate-600">
              {limitItem.product} ({limitItem.size})
            </div>
            <input
              className="udh-input"
              type="number"
              value={limitValue}
              onChange={(e) => setLimitValue(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="udh-btn-ghost" onClick={() => setLimitItem(null)}>
                Cancel
              </button>
              <button className="udh-btn-primary flex items-center gap-2" onClick={handleSaveLimit} disabled={savingLimit}>
                {savingLimit && <span className="udh-spinner" />}
                Save
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
