import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { apiDelete, apiGet, apiPost } from "../api/client";
import { useApp } from "../context/AppContext";
import { can } from "../utils/permissions";
import { Modal } from "../components/Modal";

type Props = {
  dashMode: "sales" | "buy";
  onToggleCalculator: () => void;
  onToggleCalendar: () => void;
};

export const Settings = ({ dashMode, onToggleCalculator, onToggleCalendar }: Props) => {
  const { user, catalog, refreshAll, settings, companyProfile, updateProfile } = useApp();
  const [profileForm, setProfileForm] = useState({
    companyName: companyProfile?.companyName || "",
    address: companyProfile?.address || "",
    phone: companyProfile?.phone || "",
    gstin: companyProfile?.gstin || "",
    tagline: companyProfile?.tagline || "",
    bankDetails: companyProfile?.bankDetails || "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [catalogMode, setCatalogMode] = useState<"sales" | "buy">(dashMode === "buy" ? "buy" : "sales");
  const [newItem, setNewItem] = useState({ product: "", size: "", price: 0 });
  const [catalogModal, setCatalogModal] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: "wipe" | "restore" | null;
    action: () => Promise<void>;
  }>({ open: false, type: null, action: async () => { } });
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const catalogList = useMemo(
    () => catalog.filter((c) => c.type === catalogMode),
    [catalog, catalogMode]
  );


  const handleAddCatalog = async (e: FormEvent) => {
    e.preventDefault();
    await apiPost("/catalog", { ...newItem, type: catalogMode, price: Number(newItem.price) || 0 });
    setNewItem({ product: "", size: "", price: 0 });
    await refreshAll();
  };

  const handleBackup = async () => {
    setBackupBusy(true);
    try {
      const data = await apiGet<unknown>("/backup");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `UDH_HB_Backup_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setBackupBusy(false);
    }
  };

  const handleRestore = async (e: FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const file = form.get("backup") as File;
    if (!file || file.size === 0) {
      alert("Please select a valid backup file.");
      return;
    }

    setConfirmModal({
      open: true,
      type: "restore",
      action: async () => {
        try {
          const text = await file.text();
          const json = JSON.parse(text);
          await apiPost("/backup", json);
          await refreshAll();
          setConfirmModal({ open: false, type: null, action: async () => { } });
          showToast("Data restored successfully.");
        } catch (err: any) {
          alert(err.message || "Failed to restore backup.");
        }
      },
    });
  };

  const handleWipe = () => {
    setConfirmModal({
      open: true,
      type: "wipe",
      action: async () => {
        try {
          // Assume the backend has a /wipe endpoint or we clear local data
          await apiPost("/wipe", {}); // Or apiDelete
          await refreshAll();
          setConfirmModal({ open: false, type: null, action: async () => { } });
          showToast("All data has been wiped.");
        } catch (err: any) {
          alert(err.message || "Failed to wipe data.");
        }
      }
    });
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile(profileForm);
      await refreshAll();
    } finally {
      setSavingProfile(false);
    }
  };



  return (
    <div className="space-y-6">
      <div>
        <h2 className="udh-section-title">Application Settings</h2>
      </div>

      {user?.role === "Technical Team" && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="udh-card p-4">
            <button
              className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition-colors"
              onClick={handleWipe}
            >
              Wipe All Data (Master Only)
            </button>
          </div>
          <div className="udh-card p-4">
            <div className="text-xs font-semibold text-slate-500">Backup Data</div>
            <button
              className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={handleBackup}
              disabled={backupBusy}
            >
              Export Backup
            </button>
          </div>
          <div className="udh-card p-4">
            <div className="text-xs font-semibold text-slate-500">Restore Backup</div>
            <form onSubmit={handleRestore} className="mt-3 flex flex-col gap-2">
              <input type="file" name="backup" accept="application/json" className="text-xs" />
              <button className="udh-btn-primary w-full">
                Restore Backup
              </button>
            </form>
          </div>
        </div>
      )}

      <div className={`grid gap-4 grid-cols-1 ${user?.role === "Technical Team" ? "lg:grid-cols-[280px_1fr]" : "lg:grid-cols-[320px]"}`}>
        <div className="udh-card p-5">
          <div className="mb-3 text-sm font-semibold text-slate-700">Tools</div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-700">Calculator</div>
                <div className="text-xs text-slate-400">Overlay scientific calculator</div>
              </div>
              <button
                className="udh-toggle"
                data-on={settings.calcEnabled}
                onClick={() => {
                  onToggleCalculator();
                }}
              >
                <span />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-700">Calendar Notifications</div>
                <div className="text-xs text-slate-400">Daily task reminders on dashboard</div>
              </div>
              <button
                className="udh-toggle"
                data-on={settings.calendarEnabled}
                onClick={() => {
                  onToggleCalendar();
                }}
              >
                <span />
              </button>
            </div>
          </div>
        </div>

        {user?.role === "Technical Team" && (
          <div className="udh-card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="text-rose-500">●</span> Security Settings
            </div>
            <div className="text-xs text-slate-400">Change Master Password</div>
            <div className="mt-3 flex items-center gap-2">
              <input
                className="udh-input flex-1"
                placeholder="Enter new password"
                type="password"
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    const target = e.target as HTMLInputElement;
                    if (!target.value) return;
                    await apiPost("/auth/change-tech-pass", { newPassword: target.value });
                    target.value = "";
                  }
                }}
              />
              <button
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
                onClick={async (e) => {
                  const input = (e.currentTarget.previousSibling as HTMLInputElement);
                  if (!input?.value) return;
                  await apiPost("/auth/change-tech-pass", { newPassword: input.value });
                  input.value = "";
                }}
              >
                Update
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="udh-card p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Business Profile</h3>
            <p className="text-xs text-slate-400">These details appear on your invoices and bills.</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <i className="fas fa-building"></i>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Company Name</label>
              <input
                className="udh-input w-full"
                placeholder="e.g. Udiya Halblocks (UDH)"
                value={profileForm.companyName}
                onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Tagline</label>
              <input
                className="udh-input w-full"
                placeholder="e.g. Quality you can trust"
                value={profileForm.tagline}
                onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Business Address</label>
            <textarea
              className="udh-input w-full min-h-[80px] py-3"
              placeholder="Enter full address for billing..."
              value={profileForm.address}
              onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Phone Number</label>
              <input
                className="udh-input w-full"
                placeholder="Business contact"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">GSTIN Number</label>
              <input
                className="udh-input w-full"
                placeholder="GST Registration No."
                value={profileForm.gstin}
                onChange={(e) => setProfileForm({ ...profileForm, gstin: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Bank & Payment Details</label>
            <textarea
              className="udh-input w-full min-h-[60px] py-3"
              placeholder="Bank Account, IFSC, UPI Details..."
              value={profileForm.bankDetails}
              onChange={(e) => setProfileForm({ ...profileForm, bankDetails: e.target.value })}
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={savingProfile || !can(user, "edit")}
              className="udh-btn-primary px-10 flex items-center gap-2"
            >
              {savingProfile ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : "Save Business Profile"}
            </button>
          </div>
        </form>
      </div>

      <div className="udh-card p-5">
        <div className="text-sm font-semibold text-slate-700">Catalog Management</div>
        <div className="text-xs text-slate-400">Manage products and sizes.</div>
        <button
          className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          onClick={() => setCatalogModal(true)}
          disabled={!can(user, "limits")}
        >
          Manage Catalog
        </button>
      </div>

      <Modal open={catalogModal} onClose={() => setCatalogModal(false)} className="max-w-3xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Catalog Manager</h3>
            <button onClick={() => setCatalogModal(false)}>✕</button>
          </div>
          <div className="flex gap-2">
            <button className={`rounded-lg px-3 py-1 ${catalogMode === "sales" ? "bg-indigo-600 text-white" : "border"}`} onClick={() => setCatalogMode("sales")}>
              Sales
            </button>
            <button className={`rounded-lg px-3 py-1 ${catalogMode === "buy" ? "bg-indigo-600 text-white" : "border"}`} onClick={() => setCatalogMode("buy")}>
              Purchase
            </button>
          </div>
          <form onSubmit={handleAddCatalog} className="grid gap-2 md:grid-cols-4">
            <div>
              <input
                className="rounded-lg border p-2 w-full"
                placeholder="Product"
                value={newItem.product}
                onChange={(e) => setNewItem((n) => ({ ...n, product: e.target.value }))}
                list="catalog-products-list"
                required
              />
              <datalist id="catalog-products-list">
                {Array.from(new Set(catalog.map(c => c.product))).map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div>
              <input
                className="rounded-lg border p-2 w-full"
                placeholder="Size"
                value={newItem.size}
                onChange={(e) => setNewItem((n) => ({ ...n, size: e.target.value }))}
                list="catalog-sizes-list"
                required
              />
              <datalist id="catalog-sizes-list">
                {Array.from(
                  new Set(
                    catalog
                      .filter(c => !newItem.product || c.product === newItem.product)
                      .map(c => c.size)
                  )
                ).map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <input
              className="rounded-lg border p-2"
              type="number"
              placeholder="Price"
              value={newItem.price}
              onChange={(e) => setNewItem((n) => ({ ...n, price: Number(e.target.value) }))}
            />
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Add</button>
          </form>
          <div className="max-h-80 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="p-2">Product</th>
                  <th className="p-2">Size</th>
                  <th className="p-2">Price</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {catalogList.map((item) => (
                  <tr key={item._id} className="border-t">
                    <td className="p-2">{item.product}</td>
                    <td className="p-2">{item.size}</td>
                    <td className="p-2">₹{item.price}</td>
                    <td className="p-2 text-right">
                      <button
                        className="text-rose-600"
                        onClick={async () => {
                          await apiDelete(`/catalog/${item._id}`);
                          await refreshAll();
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {catalogList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400">
                      Empty catalog
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Modal open={confirmModal.open} onClose={() => setConfirmModal({ ...confirmModal, open: false })} className="max-w-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${confirmModal.type === "wipe" ? "bg-rose-100 text-rose-600" : "bg-indigo-100 text-indigo-600"}`}>
              <i className={`fas ${confirmModal.type === "wipe" ? "fa-exclamation-triangle" : "fa-upload"} text-xl`}></i>
            </div>
            <h3 className="text-lg font-bold">
              {confirmModal.type === "wipe" ? "Wipe All Data?" : "Restore Backup?"}
            </h3>
          </div>
          <p className="text-sm text-slate-600">
            {confirmModal.type === "wipe"
              ? "Are you absolutely sure you want to wipe all transaction, inventory, and dealer data? This action cannot be undone."
              : "This will overwrite all current system data with the contents of the backup file. Do you wish to proceed?"}
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              className="rounded-xl px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              onClick={() => setConfirmModal({ ...confirmModal, open: false })}
            >
              Cancel
            </button>
            <button
              className={`rounded-xl px-4 py-2 font-bold text-white shadow-md transition-all ${confirmModal.type === "wipe" ? "bg-rose-600 hover:bg-rose-700 hover:shadow-rose-600/30" : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-600/30"
                }`}
              onClick={confirmModal.action}
            >
              {confirmModal.type === "wipe" ? "Yes, Wipe Data" : "Yes, Restore"}
            </button>
          </div>
        </div>
      </Modal>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl">
            <i className="fas fa-check-circle text-emerald-400"></i>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Modals migrate to relevant pages */}
    </div>
  );
};
