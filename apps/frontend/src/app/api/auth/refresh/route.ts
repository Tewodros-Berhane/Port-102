import { NextResponse } from "next/server";
import {
  clearTokenCookies,
  refreshFromCookie,
  setTokenCookies,
} from "@/lib/auth-route";
import { apiFailureResponse, apiRouteResponse } from "@/lib/route-response";

export async function POST() {
  const refreshed = await refreshFromCookie();
  if (!refreshed.ok) {
    const response = refreshed.body
      ? apiRouteResponse(refreshed.body, refreshed.status, "/api/auth/refresh")
      : apiFailureResponse(401, "/api/auth/refresh", {
          message: "Session could not be refreshed.",
        });
    if (refreshed.status === 401) clearTokenCookies(response);
    return response;
  }
  const response = NextResponse.json(refreshed.body);
  setTokenCookies(response, refreshed.tokens);
  return response;
}
