import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { accessCookie } from "@/lib/cookies";

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const token = (await cookies()).get(accessCookie)?.value;
  if (!token) return NextResponse.json({ success: false, statusCode: 401, error: "Unauthorized", message: "Authentication is required." }, { status: 401 });
  const { path } = await context.params; const url = new URL(request.url);
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.text();
  const result = await backendFetch(`${path.join("/")}${url.search}`, { method: request.method, body: body || undefined, headers: { authorization: `Bearer ${token}`, ...(request.headers.get("content-type") ? { "content-type": request.headers.get("content-type")! } : {}) } });
  const response = new NextResponse(JSON.stringify(result.body), { status: result.response.status, headers: { "content-type": "application/json" } });
  return response;
}
export const GET = proxy; export const POST = proxy; export const PUT = proxy; export const PATCH = proxy; export const DELETE = proxy;
