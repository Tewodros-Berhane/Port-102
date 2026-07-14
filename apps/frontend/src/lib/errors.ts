import type { ApiFailure } from "@/types/api.types";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: ApiFailure) { super(message); this.name = "ApiError"; }
}

export async function apiErrorFromResponse(response: Response) {
  const body = (await response.json().catch(() => null)) as ApiFailure | null;
  const raw = body?.message;
  const message = Array.isArray(raw) ? raw.join(" ") : raw || defaultMessage(response.status);
  return new ApiError(response.status, message, body ?? undefined);
}

function defaultMessage(status: number) {
  if (status === 401) return "Your session has expired.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested resource was not found.";
  if (status === 409) return "The request conflicts with the current state.";
  if (status === 503) return "The service is temporarily unavailable.";
  return status >= 500 ? "Something went wrong on the server." : "The request could not be completed.";
}
