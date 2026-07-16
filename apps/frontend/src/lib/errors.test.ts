import { describe, expect, it } from "vitest";
import { apiErrorFromResponse, apiErrorFromUnknown, createApiFailure, normalizeApiFailure } from "./errors";

describe("API error normalization", () => {
  it("creates the NestJS failure envelope for unavailable services", () => {
    const failure = createApiFailure(503, "/api/auth/login");
    expect(failure).toMatchObject({ success: false, statusCode: 503, error: "Service Unavailable", path: "/api/auth/login" });
    expect(failure.message).toContain("currently unavailable");
    expect(failure.timestamp).toBeTruthy();
  });

  it("preserves safe backend messages and validation arrays", () => {
    const failure = normalizeApiFailure({ success: false, statusCode: 400, error: "Bad Request", message: ["email must be an email"], timestamp: "2026-01-01T00:00:00.000Z", path: "/api/auth/login" }, 400, "/api/auth/login");
    expect(failure.message).toEqual(["email must be an email"]);
  });

  it("normalizes a browser network rejection to a service unavailable error", () => {
    const error = apiErrorFromUnknown(new TypeError("Failed to fetch"), "/api/auth/login");
    expect(error.status).toBe(503);
    expect(error.details?.path).toBe("/api/auth/login");
  });

  it("turns backend responses into typed API errors", async () => {
    const response = new Response(JSON.stringify(createApiFailure(409, "/api/resource", { message: "Resource already exists." })), { status: 409, headers: { "content-type": "application/json" } });
    const error = await apiErrorFromResponse(response);
    expect(error.status).toBe(409);
    expect(error.message).toBe("Resource already exists.");
  });
});
