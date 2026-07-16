import { describe, expect, it } from "vitest";
import { isFrontendSelfReference } from "./backend-url";

describe("backend URL safety", () => {
  it("blocks the frontend from forwarding to its own local port", () => {
    expect(isFrontendSelfReference("http://localhost:3000/api", "3000")).toBe(true);
    expect(isFrontendSelfReference("http://127.0.0.1:3000/api", "3000")).toBe(true);
  });

  it("allows the configured backend on a separate port", () => {
    expect(isFrontendSelfReference("http://localhost:8080/api", "3000")).toBe(false);
  });
});
