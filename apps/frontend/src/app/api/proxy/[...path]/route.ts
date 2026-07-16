import { cookies } from "next/headers";
import { backendFetch } from "@/lib/backend";
import { accessCookie } from "@/lib/cookies";
import { apiFailureResponse, apiRouteResponse } from "@/lib/route-response";

async function proxy(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const token = (await cookies()).get(accessCookie)?.value;
  if (!token)
    return apiFailureResponse(401, new URL(request.url).pathname, {
      message: "Authentication is required.",
    });
  const { path } = await context.params;
  const url = new URL(request.url);
  const body = ["GET", "HEAD"].includes(request.method)
    ? undefined
    : await request.text();
  const result = await backendFetch(`${path.join("/")}${url.search}`, {
    method: request.method,
    body: body || undefined,
    headers: {
      authorization: `Bearer ${token}`,
      ...(request.headers.get("content-type")
        ? { "content-type": request.headers.get("content-type")! }
        : {}),
    },
  });
  return apiRouteResponse(result.body, result.response.status, url.pathname);
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
