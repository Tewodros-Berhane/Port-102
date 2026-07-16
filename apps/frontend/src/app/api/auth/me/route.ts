import { cookies } from "next/headers";
import { backendFetch } from "@/lib/backend";
import { accessCookie } from "@/lib/cookies";
import { apiFailureResponse, apiRouteResponse } from "@/lib/route-response";

export async function GET() {
  const token = (await cookies()).get(accessCookie)?.value;
  if (!token)
    return apiFailureResponse(401, "/api/auth/me", {
      message: "Authentication is required.",
    });
  const result = await backendFetch("auth/me", {
    headers: { authorization: `Bearer ${token}` },
  });
  return apiRouteResponse(result.body, result.response.status, "/api/auth/me");
}
