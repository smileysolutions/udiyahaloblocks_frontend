import type { FormEvent } from "react";
import { useState } from "react";
import { apiPost } from "../api/client";
import { useApp } from "../context/AppContext";

type View = "login" | "forgot" | "signup";

export const AuthOverlay = () => {
  const { login } = useApp();
  const [view, setView] = useState<View>("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.target as HTMLFormElement);
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "").trim();
    try {
      await login(username, password);
    } catch (err) {
      setError("Invalid credentials");
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.target as HTMLFormElement);
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "").trim();
    try {
      await apiPost("/auth/signup-request", { username, password });
      setView("login");
    } catch (err) {
      setError("Signup request failed");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.target as HTMLFormElement);
    const username = String(form.get("username") || "").trim();
    try {
      await apiPost("/auth/request-reset", { username });
      setView("login");
    } catch (err) {
      setError("Reset request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gradient-to-r from-[#f7c97c] via-[#f6b35c] to-[#f2a23c] p-6">
      <div className="udh-auth-card max-h-[90vh] overflow-y-auto border-t-4 border-orange-600">
        <div className="mb-6 text-center">
          <div className="mx-auto flex items-center justify-center gap-2 text-orange-600">
            <svg width="28" height="28" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <rect x="4" y="4" width="8" height="8" rx="2" fill="#f59e0b" />
              <rect x="14" y="4" width="8" height="8" rx="2" fill="#fbbf24" />
              <rect x="9" y="14" width="8" height="8" rx="2" fill="#f59e0b" />
            </svg>
            <div className="text-xl font-bold tracking-wide">UDH</div>
          </div>
          <div className="mt-4 text-lg font-semibold text-slate-800">Login</div>
        </div>

        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block text-xs font-semibold text-slate-500">Username</label>
            <input className="udh-auth-input" name="username" placeholder="Enter Username" required />
            <label className="block text-xs font-semibold text-slate-500">Password</label>
            <div className="relative">
              <input
                className="udh-auth-input pr-10"
                type={showPass ? "text" : "password"}
                name="password"
                placeholder="Enter Password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPass((s) => !s)}
                aria-label="Toggle password visibility"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M1.5 12s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12Z" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </div>
            <div className="text-right text-xs text-orange-600">
              <button type="button" onClick={() => setView("forgot")}>
                Forgot Password?
              </button>
            </div>
            <button className="udh-auth-btn w-full text-sm font-semibold uppercase tracking-wide" disabled={busy}>
              {busy ? "Please wait..." : "Login to Dashboard →"}
            </button>
            <div className="text-center text-xs text-slate-500">
              New user?{" "}
              <button type="button" className="font-semibold text-orange-600" onClick={() => setView("signup")}>
                Create Request
              </button>
            </div>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="text-center text-sm font-semibold text-slate-700">Password Recovery</div>
            <label className="block text-xs font-semibold text-slate-500">Username</label>
            <input className="udh-auth-input" name="username" placeholder="Enter Username" required />
            <button className="udh-auth-btn w-full text-sm font-semibold" disabled={busy}>
              {busy ? "Sending..." : "Send Request"}
            </button>
            <button type="button" className="w-full text-xs text-slate-500" onClick={() => setView("login")}>
              Back to login
            </button>
          </form>
        )}

        {view === "signup" && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="text-center text-sm font-semibold text-slate-700">Create Request</div>
            <label className="block text-xs font-semibold text-slate-500">Username</label>
            <input className="udh-auth-input" name="username" placeholder="Desired username" required />
            <label className="block text-xs font-semibold text-slate-500">Password</label>
            <input className="udh-auth-input" type="password" name="password" placeholder="Password" required />
            <button className="udh-auth-btn w-full text-sm font-semibold" disabled={busy}>
              {busy ? "Submitting..." : "Submit Request"}
            </button>
            <button type="button" className="w-full text-xs text-slate-500" onClick={() => setView("login")}>
              Back to login
            </button>
          </form>
        )}

        {error && (
          <div className="mt-4 udh-error" title={error}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
