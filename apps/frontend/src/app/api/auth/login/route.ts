import { NextResponse } from "next/server";
import { z } from "zod";
import { backendFetch, unwrap } from "@/lib/backend";
import {
  safeSessionFromLogin,
  setTokenCookies,
  successEnvelope,
} from "@/lib/auth-route";
import type { ApiSuccess } from "@/types/api.types";
import type { BackendLogin } from "@/types/auth.types";
import { apiFailureResponse, apiRouteResponse } from "@/lib/route-response";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return apiFailureResponse(400, "/api/auth/login", {
      message: parsed.error.issues.map((issue) => issue.message),
    });
  const result = await backendFetch<BackendLogin>("auth/login", {
    method: "POST",
    body: JSON.stringify(parsed.data),
  });
  if (!result.response.ok)
    return apiRouteResponse(
      result.body,
      result.response.status,
      "/api/auth/login",
    );
  const envelope = result.body as ApiSuccess<BackendLogin>;
  const login = unwrap<BackendLogin>(result.body);
  const response = NextResponse.json(
    successEnvelope(envelope, safeSessionFromLogin(login)),
  );
  setTokenCookies(response, login.tokens);
  return response;
}
