import { useState, useEffect, Fragment } from "react";
import { apiGet } from "../api/client";
import { useApp } from "../context/AppContext";

interface LogItem {
    _id: string;
    user: string;
    role: string;
    action: string;
    details: any;
    ip: string;
    timestamp: string;
}

export const ActivityLog = () => {
    const { user } = useApp();
    const [logs, setLogs] = useState<LogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const data = await apiGet<{ logs: LogItem[] }>("/activity");
            setLogs(data.logs);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to load activity logs");
        } finally {
            setLoading(false);
        }
    };

    const formatDetails = (log: LogItem) => {
        const { action, details } = log;

        switch (action) {
            case "LOGIN_SUCCESS":
                return "User logged in successfully";
            case "LOGIN_FAILURE":
                return `Login failed for user: ${details.username || "Unknown"}`;
            case "USER_CREATED":
                return `New user "${details.username}" created as ${details.role}`;
            case "USER_UPDATED":
                return `Details updated for user "${details.username}"`;
            case "USER_DELETED":
                return `User "${details.username}" was removed from the system`;
            case "TRANSACTION_CREATED":
                return `${details.type === "sale" ? "Sale" : "Purchase"} recorded for ${details.customerName || "a dealer"}`;
            case "TRANSACTION_UPDATED":
                return `Transaction #${details.id?.slice(-6)} was modified`;
            case "BACKUP_CREATED":
                return "System database backup was successfully generated";
            case "SETTINGS_UPDATED":
                return `System settings updated: ${Object.keys(details).join(", ")}`;
            case "CATALOG_ITEM_CREATED":
                return `New item "${details.name}" added to inventory`;
            default:
                if (typeof details === "object" && details !== null && Object.keys(details).length > 0) {
                    return (
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(details).map(([k, v]) => (
                                <div key={k} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-md px-2 py-1">
                                    <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase">{k}:</span>
                                    <span className="text-xs font-bold text-slate-700">{String(v)}</span>
                                </div>
                            ))}
                        </div>
                    );
                }
                return "No additional details available";
        }
    };

    if (user?.role !== "Technical Team") {
        return (
            <div className="flex h-96 flex-col items-center justify-center text-slate-400">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mb-4 h-12 w-12">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <p>Access Restricted</p>
            </div>
        );
    }

    const groupedLogs = logs.reduce((acc, log) => {
        const date = new Date(log.timestamp).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!acc[date]) acc[date] = [];
        acc[date].push(log);
        return acc;
    }, {} as Record<string, LogItem[]>);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="udh-font-heading text-2xl font-bold text-slate-800">System Activity Log</h2>
                <button
                    onClick={loadLogs}
                    className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#f59e0b] shadow-sm hover:shadow-md transition-all border border-slate-100"
                >
                    <i className={`fas fa-sync-alt ${loading ? "animate-spin" : ""}`}></i>
                    Refresh
                </button>
            </div>

            {error && <div className="rounded-2xl bg-red-50 p-4 text-red-600 border border-red-100 text-sm font-medium">{error}</div>}

            <div className="udh-card overflow-hidden !p-0 border border-slate-200/60 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th className="p-4 pl-6">Time</th>
                                <th className="p-4">User</th>
                                <th className="p-4">Action</th>
                                <th className="p-4 pr-6">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {Object.entries(groupedLogs).map(([date, dayLogs]) => (
                                <Fragment key={date}>
                                    <tr className="bg-slate-100/50 border-y border-slate-200/60">
                                        <td colSpan={4} className="px-6 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                                            {date}
                                        </td>
                                    </tr>
                                    {dayLogs.map((log) => (
                                        <tr key={log._id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="whitespace-nowrap p-4 pl-6 align-top">
                                                <div className="text-xs font-bold text-slate-600 font-mono mt-1">
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap p-4 align-top">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold shadow-sm ${log.user === "Anonymous"
                                                        ? "bg-slate-100 text-slate-400"
                                                        : log.role === "Technical Team"
                                                            ? "bg-amber-100 text-amber-600"
                                                            : "bg-indigo-100 text-indigo-600"
                                                        }`}>
                                                        {log.user.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800">{log.user}</div>
                                                        <div className="text-[10px] font-semibold uppercase tracking-tight text-slate-400">{log.role}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 align-top">
                                                <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wide uppercase mt-1 border ${log.action.includes("SUCCESS") || log.action.includes("CREATED")
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                    : log.action.includes("FAILURE") || log.action.includes("DELETED")
                                                        ? "bg-rose-50 text-rose-600 border-rose-100"
                                                        : "bg-slate-50 text-slate-600 border-slate-200"
                                                    }`}>
                                                    {log.action.replace(/_/g, " ")}
                                                </span>
                                            </td>
                                            <td className="p-4 pr-6 text-sm text-slate-700 font-medium align-top">
                                                <div className="mt-1">{formatDetails(log)}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                            {logs.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="p-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center shadow-inner">
                                                <i className="fas fa-history text-2xl text-slate-300"></i>
                                            </div>
                                            <p className="text-slate-500 font-bold">No recent activity detected</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
