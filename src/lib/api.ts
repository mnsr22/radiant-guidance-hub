// Admin API client for the Halal Connect backend (NestJS, /api prefix).
// Base URL comes from VITE_API_URL (default: local backend on :3001).

const BASE_URL =
  (import.meta.env as Record<string, string | undefined>).VITE_API_URL?.replace(/\/$/, "") ??
  // "http://localhost:3001/api";
  "https://admin.halalconnect.space/api";

// Server origin without the `/api` prefix — socket.io namespaces live at the root.
export const SOCKET_URL = BASE_URL.replace(/\/api$/, "");

const TOKEN_KEY = "halal_admin_token";

export function getToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true } = opts;

  const url = new URL(`${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });

  // 401/403 → session is dead/insufficient; drop the token so the guard kicks in.
  if (res.status === 401 || res.status === 403) {
    clearToken();
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      (data && (Array.isArray(data.message) ? data.message.join(", ") : data.message)) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

// ── Auth ───────────────────────────────────────────────────────
export interface AdminUserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

/// Logs in via the shared /auth/login and requires the admin role. Stores the
/// access token on success.
export async function adminLogin(email: string, password: string): Promise<AdminUserInfo> {
  const res = await api<{ user: AdminUserInfo; accessToken: string }>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  if (res.user.role !== "admin") {
    throw new ApiError(403, "This account is not an admin.");
  }
  setToken(res.accessToken);
  return res.user;
}
