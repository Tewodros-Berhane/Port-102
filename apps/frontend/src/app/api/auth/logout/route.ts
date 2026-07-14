import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { clearTokenCookies } from "@/lib/auth-route";
import { refreshCookie } from "@/lib/cookies";

export async function POST() {
  const token = (await cookies()).get(refreshCookie)?.value;
  if (token) await backendFetch("auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: token }) }).catch(() => null);
  const response = NextResponse.json({ success: true, statusCode: 200, message: "Request successful", data: { loggedOut: true }, timestamp: new Date().toISOString(), path: "/api/auth/logout" });
  clearTokenCookies(response); return response;
}
