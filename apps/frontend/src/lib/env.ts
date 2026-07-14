import "server-only";
import { z } from "zod";

const schema = z.object({
  BACKEND_API_URL: z.string().url().default("http://localhost:3000/api"),
  AUTH_COOKIE_NAME: z.string().min(1).default("port102_access"),
  REFRESH_COOKIE_NAME: z.string().min(1).default("port102_refresh"),
});

export const env = schema.parse({
  BACKEND_API_URL: process.env.BACKEND_API_URL,
  AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME: process.env.REFRESH_COOKIE_NAME,
});
