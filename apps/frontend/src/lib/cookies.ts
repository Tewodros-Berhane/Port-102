import "server-only";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { env } from "./env";

export const accessCookie = env.AUTH_COOKIE_NAME;
export const refreshCookie = env.REFRESH_COOKIE_NAME;

export const authCookieOptions: Partial<ResponseCookie> = {
  httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
};

export function durationToSeconds(value: string, fallback: number) {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return fallback;
  return Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2]] ?? 1);
}
