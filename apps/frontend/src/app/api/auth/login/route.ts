import { NextResponse } from "next/server";
import { z } from "zod";
import { backendFetch, unwrap } from "@/lib/backend";
import { forward, safeSessionFromLogin, setTokenCookies, successEnvelope } from "@/lib/auth-route";
import type { ApiSuccess } from "@/types/api.types";
import type { BackendLogin } from "@/types/auth.types";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, statusCode: 400, error: "Bad Request", message: parsed.error.issues.map((i) => i.message) }, { status: 400 });
  const result = await backendFetch<BackendLogin>("auth/login", { method: "POST", body: JSON.stringify(parsed.data) });
  if (!result.response.ok) return forward(result.body, result.response.status);
  const envelope = result.body as ApiSuccess<BackendLogin>; const login = unwrap<BackendLogin>(result.body);
  const response = NextResponse.json(successEnvelope(envelope, safeSessionFromLogin(login)));
  setTokenCookies(response, login.tokens); return response;
}
