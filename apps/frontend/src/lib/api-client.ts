import { apiErrorFromResponse, apiErrorFromUnknown } from "./errors";
import type { ApiSuccess } from "@/types/api.types";

let refreshPromise: Promise<boolean> | null = null;
async function refreshSession() {
  refreshPromise ??= fetch("/api/auth/refresh", { method: "POST" }).then((response) => response.ok).catch(() => false).finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const apiPath = `/api/${path.replace(/^\//, "")}`;
  try {
    const response = await fetch(apiPath, { ...init, headers: { accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers } });
    if (response.status === 401 && retry && await refreshSession()) return request<T>(path, init, false);
    if (!response.ok) throw await apiErrorFromResponse(response);
    const value = (await response.json().catch(() => null)) as ApiSuccess<T> | null;
    if (!value || value.success !== true) throw apiErrorFromUnknown(null, apiPath);
    return value.data;
  } catch (error) {
    throw apiErrorFromUnknown(error, apiPath);
  }
}

function withQuery(path: string, query?: Record<string, string | number | boolean | undefined>) { const params = new URLSearchParams(); Object.entries(query ?? {}).forEach(([key, value]) => { if (value !== undefined) params.set(key, String(value)); }); return params.size ? `${path}?${params}` : path; }
export const apiClient = { get: <T>(path: string, query?: Record<string, string | number | boolean | undefined>) => request<T>(withQuery(path, query)), post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }), put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }), patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }), delete: <T>(path: string) => request<T>(path, { method: "DELETE" }) };
