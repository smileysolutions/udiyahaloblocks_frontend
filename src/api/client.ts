const API_BASE = import.meta.env.VITE_API_URL || "https://udiyahaloblocks-backend.onrender.com/api";

const getHeaders = () => {
  const token = localStorage.getItem("udh_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const apiGet = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const apiPost = async <T>(path: string, body?: unknown): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const apiPut = async <T>(path: string, body?: unknown): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const apiDelete = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const setToken = (token: string | null) => {
  if (token) localStorage.setItem("udh_token", token);
  else localStorage.removeItem("udh_token");
};
