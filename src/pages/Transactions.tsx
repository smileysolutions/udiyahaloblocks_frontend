import { useEffect, useMemo, useState } from "react";
import { apiDelete } from "../api/client";
import { useApp } from "../context/AppContext";
import type { Transaction } from "../api/types";
import { can } from "../utils/permissions";
import { Modal } from "../components/Modal";
import { TransactionModal } from "../components/TransactionModal";

type Props = {
  dashMode: "sales" | "buy";
  searchQuery?: string;
};

export const Transactions = ({ dashMode, searchQuery = "" }: Props) => {
  const { user, transactions, refreshAll, setFabAction, highlightId, setHighlightId, companyProfile, traders } = useApp();
  const [filters, setFilters] = useState({
    date: "",
    name: "",
    product: "all",
    size: "",
    status: "all",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [printTx, setPrintTx] = useState<Transaction | null>(null);
  const [printFormat, setPrintFormat] = useState<"bill" | "invoice">("bill");

  const products = Array.from(new Set(transactions.map((t) => t.product)));

  const filtered = useMemo(() => {
    let list = transactions.filter((t) => (dashMode === "buy" ? t.type === "buy" : t.type === "sell"));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.name?.toLowerCase().includes(q) ||
        t.product?.toLowerCase().includes(q) ||
        t.status?.toLowerCase().includes(q)
      );
    }

    return list
      .filter((t) => (filters.date ? t.date === filters.date : true))
      .filter((t) => (filters.name ? t.name.toLowerCase().includes(filters.name.toLowerCase()) : true))
      .filter((t) => (filters.product === "all" ? true : t.product === filters.product))
      .filter((t) => (filters.size ? t.size.toLowerCase().includes(filters.size.toLowerCase()) : true))
      .filter((t) => (filters.status === "all" ? true : t.status === filters.status))
      .slice(0, 100);
  }, [transactions, filters, dashMode, searchQuery]);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  useEffect(() => {
    setFabAction(() => openNew);
    return () => setFabAction(null);
  }, [setFabAction]);

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setModalOpen(true);
  };

  const handleDelete = async (tx: Transaction) => {
    if (!confirm("Delete this transaction?")) return;
    await apiDelete(`/transactions/${tx._id}`);
    await refreshAll();
  };

  useEffect(() => {
    if (highlightId) {
      // Clear filters to ensure the transaction is visible
      setFilters({
        date: "",
        name: "",
        product: "all",
        size: "",
        status: "all",
      });

      const scrollTimer = setTimeout(() => {
        const elDesktop = document.getElementById(`tx-desktop-${highlightId}`);
        const elMobile = document.getElementById(`tx-mobile-${highlightId}`);

        if (elDesktop && window.innerWidth >= 768) {
          elDesktop.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (elMobile) {
          elMobile.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);

      const timer = setTimeout(() => {
        setHighlightId(null);
      }, 2100);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(timer);
      };
    }
  }, [highlightId, setHighlightId]);

  return (
    <div className="space-y-6">
      <div className="no-print space-y-6">
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
              <div className="mb-1 text-[11px] font-semibold text-slate-400">Dealer</div>
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
                  <tr
                    key={t._id}
                    id={`tx-desktop-${t._id}`}
                    className={`border-t transition-all ${highlightId === t._id ? "udh-highlight" : ""}`}
                  >
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

          <div className="mt-4 space-y-4 md:hidden">
            {filtered.map((t) => (
              <div
                key={t._id}
                id={`tx-mobile-${t._id}`}
                className={`rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition-all ${highlightId === t._id ? "udh-highlight" : ""}`}
              >
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

        <TransactionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          editing={editing}
          dashMode={dashMode}
        />
      </div>

      <Modal open={!!printTx} onClose={() => setPrintTx(null)} className="max-w-4xl p-0 overflow-hidden rounded-3xl">
        {printTx && (
          <div className="flex flex-col h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white no-print">
              <div>
                <h3 className="udh-font-heading text-xl font-black text-slate-800 tracking-tight">Print Document</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Select Layout Format</p>
              </div>
              <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                <button
                  className={`rounded-xl px-5 py-2.5 text-sm font-black transition-all ${printFormat === "bill" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  onClick={() => setPrintFormat("bill")}
                >
                  <i className="fas fa-receipt mr-2"></i> Bill (4")
                </button>
                <button
                  className={`rounded-xl px-5 py-2.5 text-sm font-black transition-all ${printFormat === "invoice" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  onClick={() => setPrintFormat("invoice")}
                >
                  <i className="fas fa-file-invoice mr-2"></i> A4 Invoice
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-8 flex justify-center">
              {printFormat === "bill" ? (
                <div id="printable-area" className="w-[380px] bg-white p-8 shadow-2xl border border-slate-100 text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                      {companyProfile?.companyName || "Udiya Halblocks (UDH)"}
                    </h2>
                    <p className="text-[10px] uppercase font-black text-indigo-500 tracking-widest mt-2">
                      {companyProfile?.tagline || "Quality Halblocks & Materials"}
                    </p>
                    <div className="h-px bg-slate-200 w-full my-4"></div>
                    <p className="text-[11px] leading-tight text-slate-500">{companyProfile?.address || "Singampunari"}</p>
                    <p className="text-[11px] font-bold mt-1 text-slate-700">Ph: {companyProfile?.phone} | GST: {companyProfile?.gstin}</p>
                  </div>

                  <div className="flex justify-between text-[11px] font-black mb-6 uppercase tracking-wider text-slate-400">
                    <div>#{printTx._id.slice(-6).toUpperCase()}</div>
                    <div>{printTx.date}</div>
                  </div>

                  <div className="mb-6">
                    <div className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-[2px]">Bill To:</div>
                    <div className="text-lg font-black text-slate-900 leading-none">{printTx.name}</div>
                  </div>

                  <table className="w-full text-xs mb-8">
                    <thead className="border-b-2 border-slate-900">
                      <tr>
                        <th className="py-2 text-left uppercase tracking-widest font-black text-[10px]">Item</th>
                        <th className="py-2 text-right uppercase tracking-widest font-black text-[10px]">Qty</th>
                        <th className="py-2 text-right uppercase tracking-widest font-black text-[10px]">Total</th>
                      </tr>
                    </thead>
                    <tbody className="border-b border-slate-100">
                      <tr>
                        <td className="py-4">
                          <div className="font-black text-slate-900 text-sm leading-none uppercase">{printTx.product}</div>
                          <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{printTx.size}</div>
                        </td>
                        <td className="py-4 text-right font-bold text-slate-600">{printTx.qty}</td>
                        <td className="py-4 text-right font-black text-slate-900 text-sm">₹{printTx.amount.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="space-y-2 mb-8 border-b border-dashed border-slate-200 pb-6">
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>BASE AMOUNT</span>
                      <span>₹{(printTx.originalAmount || printTx.amount).toLocaleString()}</span>
                    </div>
                    {printTx.discount ? (
                      <div className="flex justify-between text-xs font-bold text-orange-500">
                        <span>DISCOUNT ({printTx.discount}%)</span>
                        <span>-₹{((printTx.originalAmount || printTx.amount) * (printTx.discount / 100)).toLocaleString()}</span>
                      </div>
                    ) : null}
                    {printTx.taxPercent ? (
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>GST ({printTx.taxPercent}%)</span>
                        <span>+₹{((printTx.originalAmount || printTx.amount) * (printTx.taxPercent / 100)).toLocaleString()}</span>
                      </div>
                    ) : null}
                    {printTx.otherCharges ? (
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>OTHER</span>
                        <span>+₹{printTx.otherCharges.toLocaleString()}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-xl font-black pt-3 border-t border-slate-900 mt-2 text-slate-900">
                      <span>NET TOTAL</span>
                      <span>₹{printTx.amount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase text-slate-300 tracking-[3px]">Thank you</p>
                  </div>
                </div>
              ) : (
                <div id="printable-area" className="w-[794px] bg-white p-16 shadow-2xl border border-slate-100 text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>
                  <div className="flex justify-between items-start mb-16">
                    <div>
                      <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-2 leading-none">
                        {companyProfile?.companyName || "Udiya Halblocks (UDH)"}
                      </h1>
                      <p className="text-sm font-black text-indigo-600 uppercase tracking-[4px]">
                        {companyProfile?.tagline || "MANUFACTURERS OF QUALITY HALBLOCKS"}
                      </p>
                      <div className="mt-6 text-xs space-y-1.5 text-slate-500 font-bold max-w-sm leading-relaxed">
                        <p>{companyProfile?.address}</p>
                        <p>Phone: <span className="text-slate-900">{companyProfile?.phone}</span></p>
                        <p>GSTIN: <span className="text-slate-900 underline decoration-indigo-500">{companyProfile?.gstin}</span></p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-slate-900 text-white px-8 py-3 text-3xl font-black mb-6 uppercase tracking-tighter rounded-xl">Invoice</div>
                      <div className="text-xs space-y-2 font-bold tracking-widest text-slate-400">
                        <p>No: <span className="text-slate-900 ml-1">#UDH-{printTx._id.slice(-8).toUpperCase()}</span></p>
                        <p>Date: <span className="text-slate-900 ml-1">{printTx.date}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-16 mb-16 py-10 border-y border-slate-100">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-indigo-500 mb-5 tracking-[3px]">Customer Details</h4>
                      <h3 className="text-2xl font-black text-slate-900 uppercase mb-3 leading-none">{printTx.name}</h3>
                      <div className="text-xs text-slate-500 space-y-2 font-bold leading-relaxed">
                        {traders.find(t => t.name === printTx.name)?.address ? (
                          <p>{traders.find(t => t.name === printTx.name)?.address}</p>
                        ) : <p className="italic text-slate-300">Address not specified</p>}
                        <p>Tel: <span className="text-slate-900">{traders.find(t => t.name === printTx.name)?.contact || "N/A"}</span></p>
                        <p>GST: <span className="text-slate-900">{traders.find(t => t.name === printTx.name)?.gstin || "N/A"}</span></p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-indigo-500 mb-5 tracking-[3px]">Order Info</h4>
                      <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Payment Method</span>
                          <span className="text-sm font-black text-slate-900 uppercase">{printTx.paymentMethod || "CASH"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Order Status</span>
                          <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${printTx.status === 'purchased' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                            {printTx.status}
                          </span>
                        </div>
                        <div className="h-px bg-slate-200"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Transaction Ref</span>
                          <span className="text-[10px] font-black text-slate-400">{printTx.upiId || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <table className="w-full mb-16">
                    <thead>
                      <tr className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-[3px]">
                        <th className="px-8 py-5 text-left rounded-l-2xl">Description</th>
                        <th className="px-8 py-5 text-right">Quantity</th>
                        <th className="px-8 py-5 text-right">UnitPrice</th>
                        <th className="px-8 py-5 text-right rounded-r-2xl">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      <tr className="border-b border-slate-100">
                        <td className="px-8 py-10">
                          <div className="font-black text-slate-900 uppercase text-lg leading-none">{printTx.product}</div>
                          <div className="text-[10px] text-indigo-500 font-black mt-2 tracking-[2px] uppercase">{printTx.size} SPECIFICATION</div>
                        </td>
                        <td className="px-8 py-10 text-right font-black text-slate-600 text-base">{printTx.qty}</td>
                        <td className="px-8 py-10 text-right font-bold text-slate-600">₹{(printTx.unitPrice || (printTx.originalAmount ? printTx.originalAmount / printTx.qty : printTx.amount / printTx.qty)).toLocaleString()}</td>
                        <td className="px-8 py-10 text-right font-black text-slate-950 text-xl">₹{(printTx.originalAmount || printTx.amount).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="flex justify-end mb-16">
                    <div className="w-96 space-y-4">
                      <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                        <span>Base Amount</span>
                        <span className="text-slate-900">₹{(printTx.originalAmount || printTx.amount).toLocaleString()}</span>
                      </div>
                      {printTx.discount ? (
                        <div className="flex justify-between text-xs font-black text-orange-400 uppercase tracking-widest">
                          <span>Discount ({printTx.discount}%)</span>
                          <span className="text-orange-600">-₹{((printTx.originalAmount || printTx.amount) * (printTx.discount / 100)).toLocaleString()}</span>
                        </div>
                      ) : null}
                      {printTx.taxPercent ? (
                        <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                          <span>GST ({printTx.taxPercent}%)</span>
                          <span className="text-slate-900">+₹{((printTx.originalAmount || printTx.amount) * (printTx.taxPercent / 100)).toLocaleString()}</span>
                        </div>
                      ) : null}
                      {printTx.otherCharges ? (
                        <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                          <span>Loading/Other</span>
                          <span className="text-slate-900">+₹{printTx.otherCharges.toLocaleString()}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between text-3xl font-black text-slate-950 border-t-4 border-slate-950 pt-5 uppercase tracking-tighter">
                        <span>Net Payable</span>
                        <span>₹{printTx.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-16 pt-16 border-t border-slate-100 items-end">
                    <div className="space-y-6">
                      <div className="text-[10px] text-slate-400 font-bold leading-relaxed max-w-xs uppercase tracking-widest">
                        <h5 className="font-black text-slate-900 mb-3 tracking-[3px]">Payment Terms</h5>
                        <p>{companyProfile?.bankDetails || "Net 30. Please include invoice number on matching payments."}</p>
                      </div>
                      <div className="bg-slate-950 text-white p-4 rounded-xl inline-block">
                        <p className="text-[9px] font-black uppercase tracking-[3px]">Total Payable: ₹{printTx.amount.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="h-24 w-60 border-b-2 border-slate-950 mb-3 opacity-10"></div>
                      <p className="text-[10px] font-black uppercase text-slate-950 tracking-[3px]">Authorized Signatory</p>
                      <p className="text-[10px] text-indigo-500 font-black uppercase mt-1 tracking-widest">For {companyProfile?.companyName || "Udiya Halblocks (UDH)"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-white no-print flex justify-end gap-3">
              <button
                className="px-8 py-3 rounded-2xl border border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                onClick={() => setPrintTx(null)}
              >
                Cancel
              </button>
              <button
                className="px-10 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all"
                onClick={() => window.print()}
              >
                <i className="fas fa-print mr-2"></i> Print Now
              </button>
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        @media print {
          /* Page setup for strict sizing */
          @page {
            margin: 0;
            size: auto; /* Fallback */
          }
          
          /* Force dimensions for 4" Bill */
          .print-bill-page {
            size: 104mm 200mm; /* Allow height to be auto but fix width */
          }
          /* Force dimensions for A4 Invoice */
          .print-a4-page {
            size: 210mm 297mm;
          }

          .no-print { display: none !important; }
          
          /* Universal hidden strategy to remove background UI */
          body {
            visibility: hidden !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Only show our printable area */
          #printable-area {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important; /* Smaller padding for POS */
            box-shadow: none !important;
            border: none !important;
            display: block !important;
          }

          /* Special widths for components */
          .print-bill { 
            width: 101mm !important; /* Exactly 4 inches */
            padding: 10px !important;
          }
          .print-a4 { 
            width: 210mm !important; 
            padding: 40px !important;
          }

          /* Reset Modal overlay for print */
          .fixed.inset-0 { 
            background: none !important; 
            position: static !important; 
            display: block !important; 
            padding: 0 !important;
            overflow: visible !important;
            visibility: hidden !important; /* Hide overlay itself */
          }
          
          /* Ensure text is black and clean */
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Transactions;
