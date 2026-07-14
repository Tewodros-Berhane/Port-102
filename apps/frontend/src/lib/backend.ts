import "server-only";
import { env } from "./env";
import type { ApiSuccess } from "@/types/api.types";

export async function backendFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${env.BACKEND_API_URL}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: { accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as ApiSuccess<T> | unknown;
  return { response, body };
}

export function unwrap<T>(body: unknown): T {
  return (body as ApiSuccess<T>).data;
}
