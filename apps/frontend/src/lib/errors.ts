import type { ApiFailure } from "@/types/api.types";

const statusDefaults: Record<number, { error: string; message: string }> = {
  400: { error: "Bad Request", message: "The request could not be completed." },
  401: { error: "Unauthorized", message: "Your session has expired." },
  403: { error: "Forbidden", message: "You do not have permission to perform this action." },
  404: { error: "Not Found", message: "The requested resource was not found." },
  409: { error: "Conflict", message: "The request conflicts with the current state." },
  422: { error: "Unprocessable Entity", message: "Some submitted values are invalid." },
  502: { error: "Bad Gateway", message: "The hotel service returned an invalid response." },
  503: { error: "Service Unavailable", message: "The hotel service is currently unavailable. Please try again shortly." },
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: ApiFailure) {
    super(message); this.name = "ApiError";
  }
}

export function createApiFailure(statusCode: number, path: string, options: { error?: string; message?: string | string[] } = {}): ApiFailure {
  const defaults = statusDefaults[statusCode] ?? (statusCode >= 500 ? { error: "Internal Server Error", message: "Something went wrong on the server." } : statusDefaults[400]);
  return { success: false, statusCode, error: options.error ?? defaults.error, message: options.message ?? defaults.message, timestamp: new Date().toISOString(), path };
}

export function isApiFailure(value: unknown): value is ApiFailure {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<ApiFailure>;
  return body.success === false && typeof body.statusCode === "number" && typeof body.error === "string" && (typeof body.message === "string" || (Array.isArray(body.message) && body.message.every((item) => typeof item === "string")));
}

export function normalizeApiFailure(value: unknown, statusCode: number, path: string): ApiFailure {
  if (!isApiFailure(value)) return createApiFailure(statusCode, path);
  return { ...value, statusCode, timestamp: typeof value.timestamp === "string" ? value.timestamp : new Date().toISOString(), path: typeof value.path === "string" ? value.path : path };
}

export async function apiErrorFromResponse(response: Response) {
  const value = await response.json().catch(() => null);
  const body = normalizeApiFailure(value, response.status, new URL(response.url || "http://local/api").pathname);
  return new ApiError(response.status, messageFromFailure(body), body);
}

export function apiErrorFromUnknown(error: unknown, path = "/api"): ApiError {
  if (error instanceof ApiError) return error;
  const body = createApiFailure(503, path);
  return new ApiError(body.statusCode, messageFromFailure(body), body);
}

export function messageFromFailure(failure: ApiFailure) {
  return Array.isArray(failure.message) ? failure.message.join(" ") : failure.message;
}

export function getApiErrorMessage(error: unknown, fallback = "The request could not be completed.") {
  return error instanceof ApiError ? error.message : fallback;
}
