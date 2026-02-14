import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete, setToken } from "../api/client";
import type {
  CatalogItem,
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
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAll: () => Promise<void>;
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

  const refreshAll = useCallback(async () => {
    if (!user) return;
    const [tx, tr, cat] = await Promise.all([
      apiGet<{ transactions: Transaction[] }>("/transactions"),
      apiGet<{ traders: Trader[] }>("/traders"),
      apiGet<{ items: CatalogItem[] }>("/catalog"),
    ]);
    setTransactions(tx.transactions);
    setTraders(tr.traders);
    setCatalog(cat.items);

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
      login,
      logout,
      refreshAll,
    }),
    [user, transactions, traders, catalog, signupRequests, passRequests, loading, login, logout, refreshAll]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
