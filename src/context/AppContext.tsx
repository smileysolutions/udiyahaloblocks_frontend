import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, setToken } from "../api/client";
import type {
  CatalogItem,
  AppSettings,
  PassRequest,
  SignupRequest,
  Trader,
  Transaction,
  User,
} from "../api/types";

type AppState = {
  user: User | null;
  transactions: Transaction[];
  traders: Trader[];
  catalog: CatalogItem[];
  signupRequests: SignupRequest[];
  passRequests: PassRequest[];
  loading: boolean;
  settings: {
    calendarEnabled: boolean;
    calcEnabled: boolean;
  };
  companyProfile: AppSettings | null;
  updateSettings: (key: "calendarEnabled" | "calcEnabled", value: boolean) => void;
  updateProfile: (data: Partial<AppSettings>) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAll: () => Promise<void>;
  fabAction: (() => void) | null;
  setFabAction: (action: (() => void) | null) => void;
  highlightId: string | null;
  setHighlightId: (id: string | null) => void;
};

const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppContext missing");
  return ctx;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [signupRequests, setSignupRequests] = useState<SignupRequest[]>([]);
  const [passRequests, setPassRequests] = useState<PassRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fabAction, setFabAction] = useState<(() => void) | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [companyProfile, setCompanyProfile] = useState<AppSettings | null>(null);
  const [settings, setSettings] = useState({
    calendarEnabled: localStorage.getItem("udh_calendar_enabled") === "true",
    calcEnabled: localStorage.getItem("udh_calc_enabled") === "true",
  });

  const updateSettings = useCallback((key: "calendarEnabled" | "calcEnabled", value: boolean) => {
    localStorage.setItem(`udh_${key === "calendarEnabled" ? "calendar_enabled" : "calc_enabled"}`, String(value));
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateProfile = useCallback(async (data: Partial<AppSettings>) => {
    const res = await apiPost<{ settings: AppSettings }>("/settings", data);
    setCompanyProfile(res.settings);
  }, []);

  const refreshAll = useCallback(async () => {
    if (!user) return;
    const [tx, tr, cat, prof] = await Promise.all([
      apiGet<{ transactions: Transaction[] }>("/transactions"),
      apiGet<{ traders: Trader[] }>("/traders"),
      apiGet<{ items: CatalogItem[] }>("/catalog"),
      apiGet<{ settings: AppSettings }>("/settings"),
    ]);
    setTransactions(tx.transactions);
    setTraders(tr.traders);
    setCatalog(cat.items);
    setCompanyProfile(prof.settings);

    if (user.role === "Technical Team") {
      const [sr, pr] = await Promise.all([
        apiGet<{ requests: SignupRequest[] }>("/auth/signup-requests"),
        apiGet<{ requests: PassRequest[] }>("/auth/pass-requests"),
      ]);
      setSignupRequests(sr.requests);
      setPassRequests(pr.requests);
    }
  }, [user]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiPost<{ token: string; user: User }>("/auth/login", {
      username,
      password,
    });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setTransactions([]);
    setTraders([]);
    setCatalog([]);
    setSignupRequests([]);
    setPassRequests([]);
  }, []);

  useEffect(() => {
    // Commented out auto-login to force login screen as requested
    /*
    const boot = async () => {
      try {
        const me = await apiGet<{ user: User }>("/auth/me");
        setUser(me.user);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    boot();
    */
    setLoading(false); // Directly show login gate
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshAll();
  }, [user, refreshAll]);

  const value = useMemo(
    () => ({
      user,
      transactions,
      traders,
      catalog,
      signupRequests,
      passRequests,
      loading,
      settings,
      companyProfile,
      updateSettings,
      updateProfile,
      login,
      logout,
      refreshAll,
      fabAction,
      setFabAction,
      highlightId,
      setHighlightId,
    }),
    [user, transactions, traders, catalog, signupRequests, passRequests, loading, settings, companyProfile, updateSettings, updateProfile, login, logout, refreshAll, fabAction, highlightId]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
