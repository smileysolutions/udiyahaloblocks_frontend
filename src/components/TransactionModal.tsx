import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Modal } from "./Modal";
import { useApp } from "../context/AppContext";
import { apiPost, apiPut } from "../api/client";
import type { Transaction } from "../api/types";

type Props = {
    open: boolean;
    onClose: () => void;
    editing?: Transaction | null;
    dashMode: "sales" | "buy";
};

const emptyTx: Partial<Transaction> = {
    date: new Date().toISOString().split("T")[0],
    qty: 1,
    type: "sell",
    status: "purchased",
    paymentMethod: "Cash",
};

export const TransactionModal = ({ open, onClose, editing, dashMode }: Props) => {
    const { traders, catalog, transactions, refreshAll, user } = useApp();
    const [form, setForm] = useState<Partial<Transaction>>(emptyTx);
    const [showPhone, setShowPhone] = useState(false);
    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");

    const catalogForMode = catalog.filter((c) => (dashMode === "buy" ? c.type === "buy" : c.type === "sales"));
    const products = Array.from(new Set(catalogForMode.map((c) => c.product)));

    useEffect(() => {
        if (editing) {
            setForm(editing);
            setShowPhone(false);
        } else {
            setForm({ ...emptyTx, type: dashMode === "buy" ? "buy" : "sell" });
            setShowPhone(false);
        }
        setError("");
        setPhone("");
    }, [editing, dashMode, open]);

    const autoCalculateTotal = (nextProduct?: string, nextSize?: string, nextQty?: number, nextTax?: number, nextOther?: number, nextDiscount?: number) => {
        const product = nextProduct ?? form.product;
        const size = nextSize ?? form.size;
        const qty = Number(nextQty ?? form.qty ?? 0);
        const tax = Number(nextTax ?? form.taxPercent ?? 0);
        const other = Number(nextOther ?? form.otherCharges ?? 0);
        const discountPct = Number(nextDiscount ?? form.discount ?? 0);

        const item = catalogForMode.find((c) => c.product === product && c.size === size);
        if (item && qty > 0) {
            const unitPrice = Math.round(item.price || 0);
            const subtotal = Math.round(unitPrice * qty);
            const taxAmount = Math.round(subtotal * (tax / 100));
            const discountAmount = Math.round(subtotal * (discountPct / 100));
            const total = Math.round(subtotal + taxAmount + other - discountAmount);

            setForm((prev) => ({
                ...prev,
                unitPrice: Math.round(unitPrice),
                discount: discountPct,
                amount: Math.round(Math.max(0, total)),
                originalAmount: Math.round(subtotal),
                paidAmount: Math.round(prev.status === "purchased" ? Math.max(0, total) : (prev.paidAmount || 0))
            }));
        }
    };

    const getCurrentStock = (product: string, size: string) => {
        return transactions.reduce((total, t) => {
            if (t.product === product && t.size === size) {
                if (t.type === "buy") {
                    return total + (t.status === "returned" ? -t.qty : t.qty);
                } else if (t.type === "sell") {
                    return total + (t.status === "returned" ? t.qty : -t.qty);
                }
            }
            return total;
        }, 0);
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
            setError("Dealer name is required.");
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

        // Validate stock availability during sales/booking
        if (payload.type === "sell") {
            const currentStock = getCurrentStock(payload.product, payload.size);
            const stockAdjustedForEdit = editing && editing.product === payload.product && editing.size === payload.size
                ? currentStock + editing.qty
                : currentStock;

            if (payload.qty > stockAdjustedForEdit) {
                setError(`Insufficient stock! Only ${stockAdjustedForEdit} available in inventory.`);
                return;
            }
        }

        const existingTrader = traders.find((t) => t.name.toLowerCase() === payload.name?.toLowerCase());
        if (!existingTrader && !phone) {
            setShowPhone(true);
            setError("Contact number is required for new dealers.");
            return;
        }

        try {
            if (!existingTrader && phone) {
                await apiPost("/traders", {
                    name: payload.name,
                    contact: phone,
                    type: "Dealer",
                });
            }

            if (editing) {
                await apiPut(`/transactions/${editing._id}`, payload);
            } else {
                await apiPost("/transactions", payload);
            }
            onClose();
            await refreshAll();
        } catch (err) {
            setError("Save failed. Please check required fields and try again.");
        }
    };

    return (
        <Modal open={open} onClose={onClose} className="max-w-lg">
            <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                        {editing ? "Edit Transaction" : dashMode === "buy" ? "Purchase Entry" : "Sales Entry"}
                    </h3>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        ✕
                    </button>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Date</label>
                    <input
                        className="udh-input"
                        type="date"
                        value={form.date || ""}
                        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                        required
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Dealer *</label>
                    <input
                        className="udh-input"
                        value={form.name || ""}
                        onChange={(e) => {
                            setForm((f) => ({ ...f, name: e.target.value }));
                            setShowPhone(!traders.some((t) => t.name.toLowerCase() === e.target.value.toLowerCase()));
                        }}
                        list="traders-list"
                        placeholder="Select or type dealer..."
                        required
                    />
                    <datalist id="traders-list">
                        {traders.map((t) => (
                            <option key={t._id} value={t.name} />
                        ))}
                    </datalist>
                </div>

                {showPhone && (
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Contact Number</label>
                        <input
                            className="udh-input"
                            placeholder="For new dealer account..."
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Product</label>
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
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Size</label>
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Qty (Units)</label>
                            {form.product && form.size && form.type === "sell" && (
                                <span className={`text-[10px] font-bold ${getCurrentStock(form.product, form.size) < (form.qty || 0) ? 'text-rose-500' : 'text-slate-400'}`}>
                                    Available: {Math.max(0, editing && editing.product === form.product && editing.size === form.size
                                        ? getCurrentStock(form.product, form.size) + editing.qty
                                        : getCurrentStock(form.product, form.size))}
                                </span>
                            )}
                        </div>
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
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Status</label>
                        <select
                            className="udh-select"
                            value={form.status || "purchased"}
                            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Transaction["status"] }))}
                        >
                            <option value="purchased">Purchased</option>
                            <option value="booked">Booked</option>
                            <option value="returned">Returned</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Payment</label>
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
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">UPI ID</label>
                        <input
                            className="udh-input"
                            value={form.upiId || ""}
                            onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))}
                            disabled={form.paymentMethod !== "UPI"}
                            placeholder="Ref no..."
                        />
                    </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-calculator text-indigo-500 text-xs"></i>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Financial Breakdown</span>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                        {user?.role === "Owner" && (
                            <div>
                                <label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-1 block">Discount %</label>
                                <input
                                    className="udh-input text-sm border-orange-200 bg-orange-50 focus:border-orange-500"
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={form.discount || 0}
                                    onChange={(e) => {
                                        const discountPct = Number(e.target.value);
                                        setForm(f => ({ ...f, discount: discountPct }));
                                        autoCalculateTotal(undefined, undefined, undefined, undefined, undefined, discountPct);
                                    }}
                                />
                            </div>
                        )}
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Tax %</label>
                            <input
                                className="udh-input text-sm"
                                type="number"
                                value={form.taxPercent || 0}
                                onChange={(e) => {
                                    const tax = Number(e.target.value);
                                    setForm(f => ({ ...f, taxPercent: tax }));
                                    autoCalculateTotal(undefined, undefined, undefined, tax);
                                }}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Other (₹)</label>
                            <input
                                className="udh-input text-sm"
                                type="number"
                                value={form.otherCharges || 0}
                                onChange={(e) => {
                                    const other = Number(e.target.value);
                                    setForm(f => ({ ...f, otherCharges: other }));
                                    autoCalculateTotal(undefined, undefined, undefined, undefined, other);
                                }}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Comm (₹)</label>
                            <input
                                className="udh-input text-sm"
                                type="number"
                                value={form.commission || 0}
                                onChange={(e) => setForm(f => ({ ...f, commission: Number(e.target.value) }))}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Total (₹)</label>
                        <div className="udh-input bg-slate-50 flex items-center justify-between border-slate-200 font-bold text-slate-800">
                            <span>₹{form.amount?.toLocaleString() || 0}</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded uppercase tracking-widest font-black">Locked</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Paid Now</label>
                        <input
                            className="udh-input"
                            type="number"
                            value={form.paidAmount || 0}
                            onChange={(e) => setForm((f) => ({ ...f, paidAmount: Number(e.target.value) }))}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Promise Date</label>
                    <input
                        className="udh-input"
                        type="date"
                        value={form.promiseDate || ""}
                        onChange={(e) => setForm((f) => ({ ...f, promiseDate: e.target.value }))}
                    />
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    {error && (
                        <div className="flex-1 text-xs font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                            <i className="fas fa-exclamation-circle mr-2"></i>{error}
                        </div>
                    )}
                    <div className="flex-1" />
                    <button type="button" className="udh-btn-ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="udh-btn-primary px-8">
                        Save Record
                    </button>
                </div>
            </form>
        </Modal>
    );
};
