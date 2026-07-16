import "server-only";
import { env } from "./env";
import { createApiFailure, isApiFailure, normalizeApiFailure } from "./errors";
import type { ApiFailure, ApiSuccess } from "@/types/api.types";
import { isFrontendSelfReference } from "./backend-url";

const BACKEND_TIMEOUT_MS = 5_000;
export type BackendResult<T> = { response: Response; body: ApiSuccess<T> | ApiFailure };

export async function backendFetch<T>(path: string, init: RequestInit = {}): Promise<BackendResult<T>> {
  const cleanPath = path.replace(/^\//, ""); const backendPath = `/api/${cleanPath}`; const url = `${env.BACKEND_API_URL}/${cleanPath}`;
  if (isFrontendSelfReference(env.BACKEND_API_URL, process.env.PORT ?? "3000")) return syntheticResult(503, backendPath);
  const timeout = AbortSignal.timeout(BACKEND_TIMEOUT_MS);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  try {
    const response = await fetch(url, { ...init, signal, headers: { accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers }, cache: "no-store" });
    const value = await response.json().catch(() => null);
    if (!response.ok) return { response, body: normalizeApiFailure(value, response.status, backendPath) };
    if (!value || typeof value !== "object" || (value as { success?: unknown }).success !== true) {
      return syntheticResult(502, backendPath);
    }
    return { response, body: value as ApiSuccess<T> };
  } catch (error) {
    const timedOut = error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
    return syntheticResult(503, backendPath, timedOut ? "The hotel service took too long to respond. Please try again shortly." : undefined);
  }
}

function syntheticResult(status: number, path: string, message?: string): BackendResult<never> {
  const body = createApiFailure(status, path, message ? { message } : undefined);
  return { response: new Response(null, { status, headers: { "content-type": "application/json" } }), body };
}

export function unwrap<T>(body: ApiSuccess<T> | ApiFailure): T {
  if (isApiFailure(body)) throw new Error("Cannot unwrap an API failure response.");
  return body.data;
}
