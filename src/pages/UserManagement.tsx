import { useState, useEffect } from "react";
import type { User, PermissionSet } from "../api/types";
import { apiGet, apiPost, apiDelete, apiPut } from "../api/client";
import { useApp } from "../context/AppContext";

export const UserManagement = () => {
    const { user: currentUser, refreshAll, signupRequests, passRequests } = useApp();
    const [users, setUsers] = useState<User[]>([]);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
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

    const permissionsList = [
        { key: "add", label: "Add Transactions", icon: "fa-plus-circle" },
        { key: "edit", label: "Edit Transactions", icon: "fa-edit" },
        { key: "delete", label: "Delete Transactions", icon: "fa-trash-alt" },
        { key: "reports", label: "View Reports", icon: "fa-chart-bar" },
        { key: "limits", label: "Stock Limits", icon: "fa-box" },
        { key: "backup", label: "Backup/Restore", icon: "fa-database" },
        { key: "addNew", label: "User Management", icon: "fa-user-cog" },
        { key: "print", label: "Print Bills", icon: "fa-print" },
    ] as const;

    const rolesList: User["role"][] = ["Owner", "Manager", "Staff", "Worker", "Guest", "Technical Team"];

    const fetchUsers = async () => {
        try {
            const res = await apiGet<{ users: User[] }>("/users");
            setUsers(res.users);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) return;
        setBusy(true);
        setError(null);
        try {
            await apiPost("/users", { username, password, role: "Staff" });
            setUsername("");
            setPassword("");
            await fetchUsers();
            await refreshAll();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to create user");
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await apiDelete(`/users/${id}`);
            await fetchUsers();
            await refreshAll();
        } catch (err) {
            alert("Failed to delete user");
        }
    };

    const openEditUser = (u: User) => {
        setEditUser(u);
        setEditRole(u.role);
        setEditPerms(u.permissions);
        setEditPassword("");
    };

    const saveEditUser = async () => {
        if (!editUser) return;
        setBusy(true);
        try {
            await apiPut(`/users/${editUser._id}`, {
                password: editPassword || undefined,
                role: editRole,
                permissions: editPerms,
            });
            setEditUser(null);
            await fetchUsers();
            await refreshAll();
        } catch (err) {
            alert("Failed to update user");
        } finally {
            setBusy(false);
        }
    };

    const approveSignup = async (req: any) => {
        try {
            await apiPost("/auth/approve-signup", { username: req.username, role: "Worker" });
            await refreshAll();
        } catch (err) {
            alert("Failed to approve signup");
        }
    };

    const denySignup = async (req: any) => {
        try {
            await apiPost("/auth/deny-signup", { username: req.username });
            await refreshAll();
        } catch (err) {
            alert("Failed to deny signup");
        }
    };

    const approveReset = async (req: any) => {
        try {
            const res = await apiPost<{ newPass: string }>("/auth/approve-reset", { username: req.username });
            alert(`New password for ${req.username}: ${res.newPass}`);
            await refreshAll();
        } catch (err) {
            alert("Failed to approve reset");
        }
    };

    const denyReset = async (req: any) => {
        try {
            await apiPost("/auth/deny-reset", { username: req.username });
            await refreshAll();
        } catch (err) {
            alert("Failed to deny reset");
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
                <h1 className="udh-font-heading text-2xl sm:text-3xl font-bold text-slate-800">User Management</h1>
            </div>

            <div className="udh-card bg-white rounded-[24px] p-6 sm:p-8 shadow-xl mb-8 sm:mb-10 border border-slate-100">
                <h3 className="text-base sm:text-lg font-bold text-slate-700 mb-6">Add New User</h3>
                <form onSubmit={handleCreateUser} className="flex gap-4 flex-wrap sm:flex-nowrap">
                    <input
                        className="udh-auth-input flex-1 min-w-[150px] bg-slate-50 border-slate-200 py-3 px-5 rounded-xl"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <input
                        className="udh-auth-input flex-1 min-w-[150px] bg-slate-50 border-slate-200 py-3 px-5 rounded-xl"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button
                        type="submit"
                        disabled={busy}
                        className="bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        <i className={`fas ${busy ? 'fa-spinner fa-spin' : 'fa-plus'} text-xl`}></i>
                        <span className="sm:hidden ml-2 font-bold">Add User</span>
                    </button>
                </form>
                {error && <p className="text-red-500 text-sm mt-3 font-semibold">{error}</p>}
            </div>

            <div className="space-y-4">
                {users.map((u) => (
                    <div key={u._id} className="udh-card bg-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md border border-slate-100 hover:border-blue-200 transition-colors text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center font-bold text-lg">
                                {u.username[0].toUpperCase()}
                            </div>
                            <div>
                                <div className="flex flex-col sm:flex-row items-center gap-2">
                                    <span className="font-bold text-slate-800 text-lg">{u.username}</span>
                                    <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${u.role === 'Owner' ? 'bg-orange-100 text-orange-600' :
                                        u.role === 'Technical Team' ? 'bg-blue-100 text-blue-600' :
                                            u.role === 'Staff' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {u.role === 'Technical Team' ? 'Developer (Technical Team)' : u.role === 'Owner' ? 'Owner' : u.role}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    <i className="fas fa-shield-alt mr-1"></i>
                                    {u.role === 'Technical Team' || u.role === 'Owner' ? 'Admin Access' : 'Standard Access'}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
                            <button
                                onClick={() => openEditUser(u)}
                                className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all shadow-sm flex-1 sm:flex-none"
                                title="Edit Permissions"
                            >
                                <i className="fas fa-cog"></i>
                            </button>
                            {u._id !== currentUser?._id && u.role !== 'Technical Team' && (
                                <button
                                    onClick={() => handleDeleteUser(u._id)}
                                    className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm flex-1 sm:flex-none"
                                    title="Delete User"
                                >
                                    <i className="fas fa-trash-alt mr-2 sm:mr-0"></i>
                                    <span className="sm:hidden font-bold">Delete</span>
                                </button>
                            )}
                            {u.role === 'Technical Team' && (
                                <div className="text-blue-500 text-xs font-bold bg-blue-50 px-3 py-2 rounded-xl border border-blue-100 flex-1 sm:flex-none">
                                    <i className="fas fa-lock mr-2"></i>Admin
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {currentUser?.role === "Technical Team" && (
                <div className="mt-12 udh-card bg-white rounded-[24px] p-8 shadow-xl border-t-4 border-amber-500">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                            <i className="fas fa-user-clock text-lg"></i>
                        </div>
                        <div>
                            <h3 className="udh-font-heading text-xl font-bold text-slate-800">Pending System Requests</h3>
                            <p className="text-xs text-slate-400 font-medium">Review and manage access requests</p>
                        </div>
                    </div>

                    <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
                        <div>
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <div className="text-xs font-black uppercase tracking-widest text-[#64748B]">New User Signups</div>
                            </div>
                            <div className="space-y-3">
                                {signupRequests.map((req) => (
                                    <div key={req._id} className="group rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:bg-white hover:shadow-md">
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-slate-700">{req.username}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Signup</div>
                                        </div>
                                        <div className="mt-4 flex gap-2">
                                            <button
                                                className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all hover:bg-emerald-600"
                                                onClick={() => approveSignup(req)}
                                            >
                                                <i className="fas fa-check mr-2"></i>Approve
                                            </button>
                                            <button
                                                className="flex-1 rounded-xl bg-slate-200 py-2.5 text-xs font-bold text-slate-600 active:scale-95 transition-all hover:bg-rose-500 hover:text-white"
                                                onClick={() => denySignup(req)}
                                            >
                                                <i className="fas fa-times mr-2"></i>Deny
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {signupRequests.length === 0 && (
                                    <div className="rounded-2xl border-2 border-dashed border-slate-100 py-8 text-center text-slate-300">
                                        <i className="fas fa-check-circle text-2xl mb-2 opacity-20"></i>
                                        <p className="text-xs font-bold uppercase tracking-widest">No pending signups</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
                                <div className="text-xs font-black uppercase tracking-widest text-[#64748B]">Reset Requests</div>
                            </div>
                            <div className="space-y-3">
                                {passRequests.map((req) => (
                                    <div key={req._id} className="group rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:bg-white hover:shadow-md">
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-slate-700">{req.username}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Reset</div>
                                        </div>
                                        <div className="mt-4 flex gap-2">
                                            <button
                                                className="flex-1 rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/20 active:scale-95 transition-all hover:bg-orange-600"
                                                onClick={() => approveReset(req)}
                                            >
                                                <i className="fas fa-key mr-2"></i>Grant
                                            </button>
                                            <button
                                                className="flex-1 rounded-xl bg-slate-200 py-2.5 text-xs font-bold text-slate-600 active:scale-95 transition-all hover:bg-rose-500 hover:text-white"
                                                onClick={() => denyReset(req)}
                                            >
                                                <i className="fas fa-times mr-2"></i>Deny
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {passRequests.length === 0 && (
                                    <div className="rounded-2xl border-2 border-dashed border-slate-100 py-8 text-center text-slate-300">
                                        <i className="fas fa-shield-alt text-2xl mb-2 opacity-20"></i>
                                        <p className="text-xs font-bold uppercase tracking-widest">No resets</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="udh-card bg-white w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl rounded-[32px] border border-slate-200">
                        {/* Modal Header */}
                        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center font-bold text-xl">
                                    {editUser.username[0].toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Edit User: {editUser.username}</h3>
                                    <p className="text-xs text-slate-400 font-medium">Manage role and feature authentications</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditUser(null)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 sm:p-8 overflow-y-auto space-y-8">
                            {/* Role Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-[#64748B] ml-1">Assigned Role</label>
                                    <select
                                        className="udh-select w-full border-slate-200 focus:border-indigo-500 rounded-xl"
                                        value={editRole}
                                        onChange={(e) => setEditRole(e.target.value as User["role"])}
                                    >
                                        {rolesList.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-xs font-black uppercase tracking-widest text-[#64748B]">New Password</label>
                                        <span className="text-[10px] text-slate-300 font-bold">(Leave blank to keep same)</span>
                                    </div>
                                    <input
                                        className="udh-auth-input w-full bg-slate-50 border-slate-200 rounded-xl py-3 px-4"
                                        type="password"
                                        placeholder="••••••••"
                                        value={editPassword}
                                        onChange={(e) => setEditPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Permissions Matrix */}
                            <div className="space-y-4">
                                <label className="text-xs font-black uppercase tracking-widest text-[#64748B] ml-1 flex items-center gap-2">
                                    <i className="fas fa-shield-check text-indigo-500"></i>
                                    Feature Authentications
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {permissionsList.map((perm) => (
                                        <div
                                            key={perm.key}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${editPerms[perm.key]
                                                    ? 'border-indigo-200 bg-indigo-50/30'
                                                    : 'border-slate-100 bg-white'
                                                }`}
                                            onClick={() => setEditPerms(p => ({ ...p, [perm.key]: !p[perm.key] }))}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${editPerms[perm.key] ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'
                                                    }`}>
                                                    <i className={`fas ${perm.icon}`}></i>
                                                </div>
                                                <span className={`text-sm font-bold ${editPerms[perm.key] ? 'text-indigo-900' : 'text-slate-600'}`}>
                                                    {perm.label}
                                                </span>
                                            </div>
                                            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${editPerms[perm.key] ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${editPerms[perm.key] ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 sm:p-8 bg-slate-50/50 border-t border-slate-100">
                            <button
                                onClick={saveEditUser}
                                disabled={busy}
                                className="w-full udh-btn-primary bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl shadow-xl shadow-indigo-600/20 font-bold active:scale-95 transition-all disabled:opacity-50"
                            >
                                {busy ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                                Save Authentication Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
