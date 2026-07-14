import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { accessCookie, authCookieOptions, durationToSeconds, refreshCookie } from "./cookies";
import { backendFetch, unwrap } from "./backend";
import type { ApiSuccess } from "@/types/api.types";
import type { BackendLogin } from "@/types/auth.types";

type Tokens = BackendLogin["tokens"];
export function setTokenCookies(response: NextResponse, tokens: Tokens) {
  response.cookies.set(accessCookie, tokens.accessToken, { ...authCookieOptions, maxAge: durationToSeconds(tokens.expiresIn, 900) });
  response.cookies.set(refreshCookie, tokens.refreshToken, { ...authCookieOptions, maxAge: 30 * 86400 });
}
export function clearTokenCookies(response: NextResponse) {
  response.cookies.set(accessCookie, "", { ...authCookieOptions, maxAge: 0 });
  response.cookies.set(refreshCookie, "", { ...authCookieOptions, maxAge: 0 });
}
export function forward(body: unknown, status: number) { return NextResponse.json(body, { status }); }
export async function refreshFromCookie() {
  const token = (await cookies()).get(refreshCookie)?.value;
  if (!token) return null;
  const result = await backendFetch<Tokens>("auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: token }) });
  return result.response.ok ? { tokens: unwrap<Tokens>(result.body), body: result.body } : null;
}
export function safeSessionFromLogin(login: BackendLogin) {
  return { id: login.user.id, fullName: login.user.fullName, email: login.user.email, status: login.user.status, role: login.role, department: login.department, permissions: login.permissions };
}
export function successEnvelope<T>(source: ApiSuccess<unknown>, data: T): ApiSuccess<T> { return { ...source, data }; }
