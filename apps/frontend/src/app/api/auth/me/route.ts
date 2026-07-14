import { cookies } from "next/headers";
import { backendFetch } from "@/lib/backend";
import { forward } from "@/lib/auth-route";
import { accessCookie } from "@/lib/cookies";

export async function GET() {
  const token = (await cookies()).get(accessCookie)?.value;
  if (!token) return forward({ success: false, statusCode: 401, error: "Unauthorized", message: "Authentication is required." }, 401);
  const result = await backendFetch("auth/me", { headers: { authorization: `Bearer ${token}` } });
  return forward(result.body, result.response.status);
}
