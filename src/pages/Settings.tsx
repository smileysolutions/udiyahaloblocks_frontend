import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { apiDelete, apiGet, apiPost, apiPut } from "../api/client";
import { useApp } from "../context/AppContext";
import { can } from "../utils/permissions";
import { Modal } from "../components/Modal";
import type { SignupRequest, PassRequest, User, PermissionSet } from "../api/types";

type Props = {
  dashMode: "sales" | "buy";
  onToggleCalculator: () => void;
  onToggleCalendar: () => void;
};

export const Settings = ({ dashMode, onToggleCalculator, onToggleCalendar }: Props) => {
  const { user, catalog, signupRequests, passRequests, refreshAll } = useApp();
  const [catalogMode, setCatalogMode] = useState<"sales" | "buy">(dashMode === "buy" ? "buy" : "sales");
  const [newItem, setNewItem] = useState({ product: "", size: "", price: 0 });
  const [userModal, setUserModal] = useState(false);
  const [catalogModal, setCatalogModal] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "Staff" });
  const [users, setUsers] = useState<User[]>([]);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<User["role"]>("Worker");
  const [editPerms, setEditPerms] = useState<PermissionSet>({
    add: false,
    edit: false,
    delete: false,
    reports: false,
    limits: false,
    backup: false,
    print: false,
    addNew: false,
  });
  const [calcEnabled, setCalcEnabled] = useState(false);
  const [calendarEnabled, setCalendarEnabled] = useState(false);

  const catalogList = useMemo(
    () => catalog.filter((c) => c.type === catalogMode),
    [catalog, catalogMode]
  );

  const permissionsList = [
    { key: "add", label: "Add Transactions" },
    { key: "edit", label: "Edit Transactions" },
    { key: "delete", label: "Delete Transactions" },
    { key: "reports", label: "View Reports" },
    { key: "limits", label: "Stock Limits" },
    { key: "backup", label: "Backup Data" },
    { key: "addNew", label: "Add New Users" },
    { key: "print", label: "Print Bills" },
  ] as const;

  const loadUsers = async () => {
    const res = await apiGet<{ users: User[] }>("/users");
    setUsers(res.users);
  };

  const openEditUser = (u: User) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditPerms(u.permissions);
    setEditPassword("");
  };

  const saveEditUser = async () => {
    if (!editUser) return;
    await apiPut(`/users/${editUser._id}`, {
      password: editPassword || undefined,
      role: editRole,
      permissions: editPerms,
    });
    setEditUser(null);
    setEditPassword("");
    await loadUsers();
  };

  const generatePassword = () => {
    const rand = Math.random().toString(36).slice(2, 8);
    setEditPassword(rand);
  };

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
      link.download = `UDH_Backup_${new Date().toISOString().split("T")[0]}.json`;
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
    if (!file) return;
    const text = await file.text();
    const json = JSON.parse(text);
    await apiPost("/backup", json);
    await refreshAll();
  };

  const addUser = async () => {
    if (user?.role === "Technical Team" || user?.role === "Owner") {
      await apiPost("/users", {
        username: newUser.username,
        password: newUser.password,
        role: newUser.role,
      });
      await loadUsers();
    } else {
      await apiPost("/auth/signup-request", {
        username: newUser.username,
        password: newUser.password,
      });
    }
    setNewUser({ username: "", password: "", role: "Staff" });
  };

  const deleteUser = async (id: string) => {
    await apiDelete(`/users/${id}`);
    await loadUsers();
  };

  const approveSignup = async (req: SignupRequest) => {
    await apiPost("/auth/approve-signup", { username: req.username, role: "Worker" });
    await refreshAll();
  };

  const denySignup = async (req: SignupRequest) => {
    await apiPost("/auth/deny-signup", { username: req.username });
    await refreshAll();
  };

  const approveReset = async (req: PassRequest) => {
    const res = await apiPost<{ newPass: string }>("/auth/approve-reset", { username: req.username });
    alert(`New password for ${req.username}: ${res.newPass}`);
    await refreshAll();
  };

  const denyReset = async (req: PassRequest) => {
    await apiPost("/auth/deny-reset", { username: req.username });
    await refreshAll();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="udh-section-title">Application Settings</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="udh-card p-4">
          <button className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-500">
            Wipe All Data (Master Only)
          </button>
        </div>
        <div className="udh-card p-4">
          <div className="text-xs font-semibold text-slate-500">Backup Data</div>
          <button
            className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            onClick={handleBackup}
            disabled={backupBusy || !can(user, "backup")}
          >
            Export Backup
          </button>
        </div>
        <div className="udh-card p-4">
          <div className="text-xs font-semibold text-slate-500">Restore Backup</div>
          <form onSubmit={handleRestore} className="mt-3 flex flex-col gap-2">
            <input type="file" name="backup" accept="application/json" className="text-xs" />
            <button className="udh-btn-primary w-full" disabled={!can(user, "backup")}>
              Restore Backup
            </button>
          </form>
        </div>
        <div className="udh-card p-4">
          <div className="text-xs font-semibold text-slate-500">User Management</div>
          <button
            className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            onClick={() => {
              setUserModal(true);
              if (user?.role === "Technical Team" || user?.role === "Owner") loadUsers();
            }}
            disabled={(!can(user, "addNew") && user?.role !== "Technical Team" && user?.role !== "Owner")}
          >
            Manage Users
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
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
                data-on={calcEnabled}
                onClick={() => {
                  setCalcEnabled((s) => !s);
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
                data-on={calendarEnabled}
                onClick={() => {
                  setCalendarEnabled((s) => !s);
                  onToggleCalendar();
                }}
              >
                <span />
              </button>
            </div>
          </div>
        </div>

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

      {user?.role === "Technical Team" && (
        <div className="udh-card p-5">
          <h3 className="text-sm font-semibold text-slate-700">Pending Requests</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-slate-500">Signup Requests</div>
              <div className="mt-2 space-y-2">
                {signupRequests.map((req) => (
                  <div key={req._id} className="rounded-lg border p-3 text-sm">
                    <div className="font-semibold">{req.username}</div>
                    <div className="mt-2 flex gap-2">
                      <button className="rounded bg-emerald-600 px-2 py-1 text-white" onClick={() => approveSignup(req)}>
                        Approve
                      </button>
                      <button className="rounded bg-rose-600 px-2 py-1 text-white" onClick={() => denySignup(req)}>
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
                {signupRequests.length === 0 && <div className="text-xs text-slate-400">No requests</div>}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Reset Requests</div>
              <div className="mt-2 space-y-2">
                {passRequests.map((req) => (
                  <div key={req._id} className="rounded-lg border p-3 text-sm">
                    <div className="font-semibold">{req.username}</div>
                    <div className="mt-2 flex gap-2">
                      <button className="rounded bg-emerald-600 px-2 py-1 text-white" onClick={() => approveReset(req)}>
                        Grant
                      </button>
                      <button className="rounded bg-rose-600 px-2 py-1 text-white" onClick={() => denyReset(req)}>
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
                {passRequests.length === 0 && <div className="text-xs text-slate-400">No requests</div>}
              </div>
            </div>
          </div>
        </div>
      )}

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
            <input
              className="rounded-lg border p-2"
              placeholder="Product"
              value={newItem.product}
              onChange={(e) => setNewItem((n) => ({ ...n, product: e.target.value }))}
              required
            />
            <input
              className="rounded-lg border p-2"
              placeholder="Size"
              value={newItem.size}
              onChange={(e) => setNewItem((n) => ({ ...n, size: e.target.value }))}
              required
            />
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

      <Modal open={userModal} onClose={() => setUserModal(false)} className="max-w-lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">User Management</h3>
            <button onClick={() => setUserModal(false)}>✕</button>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400">Add New User</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                className="udh-input"
                placeholder="Username"
                value={newUser.username}
                onChange={(e) => setNewUser((n) => ({ ...n, username: e.target.value }))}
              />
              <input
                className="udh-input"
                placeholder="Password"
                value={newUser.password}
                onChange={(e) => setNewUser((n) => ({ ...n, password: e.target.value }))}
              />
              <button className="rounded-xl bg-blue-600 px-3 py-2 text-white" onClick={addUser}>
                +
              </button>
            </div>
          </div>

          {(user?.role === "Technical Team" || user?.role === "Owner") && (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u._id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{u.username}</div>
                    <div className="text-xs text-slate-400">Password: ••••••</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600">
                      {u.role}
                    </span>
                    <button className="text-xs text-slate-500" onClick={() => openEditUser(u)}>
                      Edit
                    </button>
                    <button className="text-xs text-rose-500" onClick={() => deleteUser(u._id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {users.length === 0 && <div className="text-xs text-slate-400">No users found</div>}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} className="max-w-lg">
        {editUser && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit User: {editUser.username}</h3>
              <button onClick={() => setEditUser(null)}>✕</button>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Username</label>
              <input className="udh-input" value={editUser.username} disabled />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500">Password</label>
                <button className="text-xs font-semibold text-orange-500" onClick={generatePassword}>
                  Generate
                </button>
              </div>
              <input
                className="udh-input"
                type="text"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Assigned Role</label>
              <select
                className="udh-select border-orange-400"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as User["role"])}
              >
                <option value="Worker">Worker</option>
                <option value="Staff">Staff</option>
                <option value="Owner">Owner</option>
                <option value="Technical Team">Technical Team</option>
              </select>
            </div>
            <div>
              <div className="text-xs font-semibold text-orange-500">Access Permissions</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {permissionsList.map((perm) => (
                  <label key={perm.key} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={editPerms[perm.key]}
                      onChange={(e) =>
                        setEditPerms((p) => ({ ...p, [perm.key]: e.target.checked }))
                      }
                    />
                    {perm.label}
                  </label>
                ))}
              </div>
            </div>
            <button className="udh-btn-primary w-full" onClick={saveEditUser}>
              Save Changes
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
