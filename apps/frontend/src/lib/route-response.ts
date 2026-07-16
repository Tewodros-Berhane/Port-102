import "server-only";
import { NextResponse } from "next/server";
import { createApiFailure, normalizeApiFailure } from "./errors";

export function apiRouteResponse(body: unknown, status: number, path: string) {
  return NextResponse.json(status >= 400 ? normalizeApiFailure(body, status, path) : body, { status });
}

export function apiFailureResponse(status: number, path: string, options?: { error?: string; message?: string | string[] }) {
  return NextResponse.json(createApiFailure(status, path, options), { status });
}
