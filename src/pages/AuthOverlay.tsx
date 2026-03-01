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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      setSuccessMsg("Signup request submitted! Please wait for approval.");
      setTimeout(() => {
        setSuccessMsg(null);
        setView("login");
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Signup request failed");
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
      setSuccessMsg("Reset request sent to the master!");
      setTimeout(() => {
        setSuccessMsg(null);
        setView("login");
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Reset request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-[#f59e0b] p-4 sm:p-6">
      <div className="udh-auth-card w-full max-w-[440px] border-t-[6px] border-[#d97706] shadow-2xl p-6 sm:p-8 bg-white rounded-[24px] my-4 sm:my-0">
        <div className="mb-10 text-center">
          <div className="udh-card p-4 sm:p-5">
            <div className="grid gap-4 md:grid-cols-5">
              <div className="mx-auto flex items-center justify-center gap-3 text-[#f59e0b]">
                <i className="fas fa-cubes text-4xl"></i>
                <div className="udh-font-heading text-4xl font-extrabold tracking-tight text-[#0f172a]">UDH</div>
              </div>
            </div>
          </div>
          <div className="udh-font-heading mt-6 text-xl font-bold text-slate-400 uppercase tracking-widest leading-none">
            {view === "login" ? "Login" : view === "signup" ? "Request Access" : "Password Recovery"}
          </div>
        </div>

        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-600">Username</label>
              <input
                className="udh-auth-input bg-slate-50 border-slate-200 focus:bg-white transition-all py-4 px-5 rounded-2xl"
                name="username"
                placeholder="Enter Username"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-600">Password</label>
              <div className="relative">
                <input
                  className="udh-auth-input bg-slate-50 border-slate-200 focus:bg-white transition-all py-4 px-5 pr-14 rounded-2xl"
                  type={showPass ? "text" : "password"}
                  name="password"
                  placeholder="Enter Password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  onClick={() => setShowPass((s) => !s)}
                  aria-label="Toggle password visibility"
                >
                  <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'} text-xl`}></i>
                </button>
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setView("forgot")}
                className="text-sm font-bold text-[#f59e0b] hover:opacity-80 transition-opacity"
              >
                Forgot Password?
              </button>
            </div>

            <button className="udh-auth-btn w-full py-5 rounded-2xl text-base font-black uppercase tracking-widest flex items-center justify-center gap-3 group transition-all" disabled={busy}>
              {busy ? "PLEASE WAIT..." : (
                <>
                  <span>LOGIN TO DASHBOARD</span>
                  <i className="fas fa-arrow-right transition-transform group-hover:translate-x-2"></i>
                </>
              )}
            </button>

            <div className="pt-6 border-t border-slate-100 text-center">
              <p className="text-sm font-semibold text-slate-400">
                New user?{" "}
                <button
                  type="button"
                  className="font-black text-[#f59e0b] hover:underline"
                  onClick={() => setView("signup")}
                >
                  Create Request
                </button>
              </p>
            </div>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={handleReset} className="space-y-6">
            <p className="text-center text-sm font-semibold text-slate-400 leading-relaxed">
              Enter your username. The Master will receive your reset request.
            </p>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-600">Username</label>
              <input className="udh-auth-input bg-slate-50 py-4 px-5 rounded-2xl" name="username" placeholder="Enter Username" required />
            </div>
            <button className="udh-auth-btn w-full py-5 rounded-2xl text-base font-black uppercase tracking-widest" disabled={busy} style={{ background: '#3b82f6' }}>
              {busy ? "SENDING..." : "SEND REQUEST"}
            </button>
            <button type="button" className="w-full text-sm font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-2" onClick={() => setView("login")}>
              <i className="fas fa-arrow-left"></i> Back to login
            </button>
          </form>
        )}

        {view === "signup" && (
          <form onSubmit={handleSignup} className="space-y-6">
            <p className="text-center text-sm font-semibold text-slate-400 leading-relaxed">
              Submit your details for approval.
            </p>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-600">Username</label>
              <input className="udh-auth-input bg-slate-50 py-4 px-5 rounded-2xl" name="username" placeholder="Desired username" required />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-600">Password</label>
              <input className="udh-auth-input bg-slate-50 py-4 px-5 rounded-2xl" type="password" name="password" placeholder="Password" required />
            </div>
            <button className="udh-auth-btn w-full py-5 rounded-2xl text-base font-black uppercase tracking-widest" disabled={busy} style={{ background: '#10b981' }}>
              {busy ? "SUBMITTING..." : "SUBMIT REQUEST"}
            </button>
            <button type="button" className="w-full text-sm font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-2" onClick={() => setView("login")}>
              <i className="fas fa-arrow-left"></i> Back to login
            </button>
          </form>
        )}

        {error && (
          <div className="mt-8 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 font-bold text-sm animate-shake">
            <i className="fas fa-exclamation-circle text-lg"></i>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-8 p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-emerald-600 font-bold text-sm animate-fade-in">
            <i className="fas fa-check-circle text-lg"></i>
            <span>{successMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
