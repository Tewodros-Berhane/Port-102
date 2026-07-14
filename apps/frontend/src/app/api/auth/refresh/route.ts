import { NextResponse } from "next/server";
import { clearTokenCookies, refreshFromCookie, setTokenCookies } from "@/lib/auth-route";

export async function POST() {
  const refreshed = await refreshFromCookie();
  if (!refreshed) { const response = NextResponse.json({ success: false, statusCode: 401, error: "Unauthorized", message: "Session could not be refreshed." }, { status: 401 }); clearTokenCookies(response); return response; }
  const response = NextResponse.json(refreshed.body); setTokenCookies(response, refreshed.tokens); return response;
}
