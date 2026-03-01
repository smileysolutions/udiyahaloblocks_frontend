import { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { Modal } from "../components/Modal";
import { can } from "../utils/permissions";
import { apiPost, apiPut, apiGet } from "../api/client";
import type { CatalogItem, Transaction } from "../api/types";

type Props = {
  dashMode: "sales" | "buy";
  searchQuery?: string;
};

const buildInventoryStats = (transactions: Transaction[]) => {
  const stockMap: Record<string, number> = {};
  const soldMap: Record<string, number> = {};
  transactions.forEach((t) => {
    const key = `${t.product}-${t.size}`;
    if (t.type === "buy") {
      if (t.status === "returned") {
        stockMap[key] = (stockMap[key] || 0) - t.qty;
      } else {
        stockMap[key] = (stockMap[key] || 0) + t.qty;
      }
    } else if (t.type === "sell") {
      if (t.status === "returned") {
        stockMap[key] = (stockMap[key] || 0) + t.qty;
      } else {
        stockMap[key] = (stockMap[key] || 0) - t.qty;
        soldMap[key] = (soldMap[key] || 0) + t.qty;
      }
    }
  });
  return { stockMap, soldMap };
};

export const Inventory = ({ dashMode, searchQuery = "" }: Props) => {
  const { user, transactions, catalog, refreshAll, setFabAction } = useApp();

  useEffect(() => {
    setFabAction(() => () => setAddModalOpen(true));
    return () => setFabAction(null);
  }, [setFabAction]);

  const [ledgerItem, setLedgerItem] = useState<CatalogItem | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [limitItem, setLimitItem] = useState<CatalogItem | null>(null);
  const [limitValue, setLimitValue] = useState("");
  const [newItem, setNewItem] = useState({ product: "", size: "", price: "", limit: "" });
  const [savingAdd, setSavingAdd] = useState(false);
  const [savingLimit, setSavingLimit] = useState(false);

  const [priceLogItem, setPriceLogItem] = useState<CatalogItem | null>(null);
  const [priceLogs, setPriceLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [priceEditItem, setPriceEditItem] = useState<CatalogItem | null>(null);
  const [priceValue, setPriceValue] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  const [stockAddItem, setStockAddItem] = useState<CatalogItem | null>(null);
  const [stockAddQty, setStockAddQty] = useState("1");
  const [stockAddPrice, setStockAddPrice] = useState("");
  const [savingStockAdd, setSavingStockAdd] = useState(false);

  const { stockMap, soldMap } = useMemo(() => buildInventoryStats(transactions), [transactions]);
  const items = useMemo(() => {
    let list = catalog;
    if (dashMode === "sales") {
      list = list.filter((c) => c.type === "sales");
    } else {
      list = list.filter((c) => c.type === "buy");
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.product?.toLowerCase().includes(q) ||
        c.size?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [catalog, dashMode, searchQuery]);

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

  const handleSavePrice = async () => {
    if (!priceEditItem) return;
    const price = Number(priceValue);
    if (Number.isNaN(price) || price < 0) return;
    setSavingPrice(true);
    try {
      await apiPut(`/catalog/${priceEditItem._id}`, { price });
      setPriceEditItem(null);
      await refreshAll();
    } finally {
      setSavingPrice(false);
    }
  };

  const openPriceLogs = async (item: CatalogItem) => {
    setPriceLogItem(item);
    setLoadingLogs(true);
    try {
      const res = await apiGet<{ logs: any[] }>(`/price-logs?product=${encodeURIComponent(item.product)}`);
      setPriceLogs(res.logs || []);
    } catch {
      setPriceLogs([]);
    } finally {
      setLoadingLogs(false);
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

  const handleAddStock = async () => {
    if (!stockAddItem) return;
    const qty = Number(stockAddQty);
    const unitPrice = Number(stockAddPrice || stockAddItem.price || 0);

    if (qty <= 0) return;

    setSavingStockAdd(true);
    try {
      const payload = {
        date: new Date().toISOString().split("T")[0],
        type: "buy",  // All stock additions are incoming 'buy' transactions
        name: "Inventory Addition",
        product: stockAddItem.product,
        size: stockAddItem.size,
        qty: Math.round(qty),
        unitPrice: Math.round(unitPrice),
        amount: Math.round(qty * unitPrice),
        originalAmount: Math.round(qty * unitPrice),
        taxPercent: 0,
        otherCharges: 0,
        discount: 0,
        status: "purchased", // Important: must be purchased to count as finalized
        paymentMethod: "Cash",
        paidAmount: Math.round(qty * unitPrice),
      };

      await apiPost("/transactions", payload);
      setStockAddItem(null);
      setStockAddQty("1");
      setStockAddPrice("");
      await refreshAll();
    } catch (err) {
      console.error("Failed to add stock:", err);
    } finally {
      setSavingStockAdd(false);
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
                  const actualQty = stockMap[key] || 0;
                  const qty = Math.max(0, actualQty);
                  const soldQty = soldMap[key] || 0;
                  const isLow = item.limit != null && actualQty < item.limit;
                  return (
                    <div
                      key={item._id}
                      className={`rounded-xl border p-4 shadow-sm transition-all ${actualQty <= 0
                        ? "border-rose-200 bg-rose-50"
                        : isLow
                          ? "border-orange-200 bg-orange-50/50"
                          : "border-slate-100 bg-white"
                        }`}
                      onClick={() => setLedgerItem(item)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{item.product}</div>
                        {actualQty <= 0 ? (
                          <div className="text-[9px] font-black uppercase text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md tracking-widest border border-rose-200">Out of Stock</div>
                        ) : isLow ? (
                          <div className="text-[9px] font-black uppercase text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md tracking-widest border border-orange-200">Low Stock</div>
                        ) : null}
                      </div>

                      <div className={`text-4xl font-black mt-2 mb-1 ${actualQty <= 0 ? "text-rose-600" : isLow ? "text-orange-500" : "text-slate-800"}`}>{qty}</div>

                      <div className="flex justify-between items-center mt-2 mb-2">
                        <div className="text-xs font-bold text-slate-400">{item.size}</div>
                        <div className="text-sm font-black text-emerald-600">₹{item.price?.toLocaleString() || 0}</div>
                      </div>
                      <div className="flex justify-between items-center pb-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Sold</div>
                        <div className="text-sm font-black text-indigo-600">{soldQty}</div>
                      </div>

                      <div className="mt-1 flex flex-wrap gap-2 border-t border-slate-200/60 pt-3">
                        {user?.role === "Owner" && (
                          <button
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-widest"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPriceEditItem(item);
                              setPriceValue(String(item.price || 0));
                            }}
                          >
                            <i className="fas fa-tag mr-1"></i> Edit Price
                          </button>
                        )}
                        <button
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStockAddItem(item);
                            setStockAddPrice(String(item.price || 0));
                          }}
                        >
                          <i className="fas fa-plus mt-1 mr-1"></i> Add Stock
                        </button>
                        {can(user, "limits") && (
                          <button
                            className="text-[10px] font-bold text-orange-600 hover:text-orange-700 uppercase tracking-widest"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLimit(item);
                            }}
                          >
                            <i className="fas fa-box mt-1 mr-1"></i> Set Limit
                          </button>
                        )}
                        {user?.role === "Technical Team" && (
                          <button
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPriceLogs(item);
                            }}
                          >
                            <i className="fas fa-history mr-1"></i> Logs
                          </button>
                        )}
                      </div>
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
            {user?.role === "Owner" && (
              <input
                className="udh-input"
                type="number"
                placeholder="Price"
                value={newItem.price}
                onChange={(e) => setNewItem((n) => ({ ...n, price: e.target.value }))}
              />
            )}
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

      <Modal open={!!priceEditItem} onClose={() => setPriceEditItem(null)} className="max-w-sm">
        {priceEditItem && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold cursor-pointer">Set Unit Price</h3>
              <button onClick={() => setPriceEditItem(null)}>✕</button>
            </div>
            <div className="text-sm text-slate-600">
              {priceEditItem.product} ({priceEditItem.size})
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">New Price (₹)</label>
              <input
                className="udh-input"
                type="number"
                min={0}
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="udh-btn-ghost" onClick={() => setPriceEditItem(null)}>
                Cancel
              </button>
              <button className="udh-btn-primary flex items-center gap-2" onClick={handleSavePrice} disabled={savingPrice}>
                {savingPrice && <span className="udh-spinner" />}
                Save
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!stockAddItem} onClose={() => setStockAddItem(null)} className="max-w-sm">
        {stockAddItem && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Quick Add Stock</h3>
              <button onClick={() => setStockAddItem(null)}>✕</button>
            </div>
            <div className="text-sm font-semibold text-slate-700">
              {stockAddItem.product} ({stockAddItem.size})
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Qty</label>
                <input
                  className="udh-input"
                  type="number"
                  min="1"
                  value={stockAddQty}
                  onChange={(e) => setStockAddQty(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Unit Price</label>
                <input
                  className="udh-input"
                  type="number"
                  min="0"
                  value={stockAddPrice}
                  onChange={(e) => setStockAddPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="udh-btn-ghost" onClick={() => setStockAddItem(null)}>
                Cancel
              </button>
              <button className="udh-btn-primary flex items-center gap-2 px-6" onClick={handleAddStock} disabled={savingStockAdd}>
                {savingStockAdd && <span className="udh-spinner border-white" />}
                Add Stock
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!priceLogItem} onClose={() => setPriceLogItem(null)} className="max-w-2xl">
        {priceLogItem && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold">Price Change Logs</h3>
              <button onClick={() => setPriceLogItem(null)}>✕</button>
            </div>
            <div className="font-semibold text-slate-700">{priceLogItem.product}</div>

            <div className="max-h-[60vh] overflow-y-auto">
              {loadingLogs ? (
                <div className="text-center text-slate-500 py-8">Loading logs...</div>
              ) : priceLogs.length === 0 ? (
                <div className="text-center text-slate-400 py-8 italic border border-dashed rounded-xl bg-slate-50">No price changes recorded yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="p-4 rounded-tl-lg">Date</th>
                      <th className="p-4">Size</th>
                      <th className="p-4">Old Price</th>
                      <th className="p-4">New Price</th>
                      <th className="p-4 rounded-tr-lg">Changed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceLogs.map((log) => (
                      <tr key={log._id} className="border-t border-slate-100">
                        <td className="p-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 font-semibold">{log.size}</td>
                        <td className="p-4 text-slate-500 line-through">₹{log.oldPrice?.toLocaleString()}</td>
                        <td className="p-4 font-black text-emerald-600">₹{log.newPrice?.toLocaleString()}</td>
                        <td className="p-4 text-xs font-bold text-slate-500">{log.changedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
