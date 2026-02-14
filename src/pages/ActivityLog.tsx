import { useState, useEffect } from "react";
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Activity Log</h2>
                <button onClick={loadLogs} className="text-indigo-600 hover:text-indigo-800">
                    Refresh
                </button>
            </div>

            {error && <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>}

            <div className="udh-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="udh-table w-full">
                        <thead>
                            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <th className="p-4">Time</th>
                                <th className="p-4">User</th>
                                <th className="p-4">Action</th>
                                <th className="p-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.map((log) => (
                                <tr key={log._id} className="hover:bg-slate-50">
                                    <td className="whitespace-nowrap p-4 text-sm text-slate-500">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="whitespace-nowrap p-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${log.role === "Technical Team" ? "bg-indigo-500" : log.role === "Owner" ? "bg-emerald-500" : "bg-slate-400"}`}>
                                                {log.user.charAt(0).toUpperCase()}
                                            </span>
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">{log.user}</div>
                                                <div className="text-xs text-slate-400">{log.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                        <pre className="whitespace-pre-wrap font-mono text-xs text-slate-500">
                                            {JSON.stringify(log.details, null, 2)}
                                        </pre>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400">
                                        No activity logs found.
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
