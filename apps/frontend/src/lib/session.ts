import "server-only";
import { cookies } from "next/headers";
import { backendFetch, unwrap } from "./backend";
import { accessCookie } from "./cookies";
import type { Session } from "@/types/auth.types";

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(accessCookie)?.value; if (!token) return null;
  const result = await backendFetch<Session>("auth/me", { headers: { authorization: `Bearer ${token}` } });
  return result.response.ok ? unwrap<Session>(result.body) : null;
}
