import { describe, expect, it } from "vitest";
import { getDefaultAuthenticatedRoute } from "./routes";

describe("authenticated landing route", () => {
  it("prefers the dashboard when it is permitted", () => {
    expect(
      getDefaultAuthenticatedRoute(["reports.dashboard.read", "users.read"]),
    ).toBe("/dashboard");
  });

  it("uses the first feature the user can actually access", () => {
    expect(
      getDefaultAuthenticatedRoute(["housekeeping.tasks.read.assigned"]),
    ).toBe("/housekeeping/assigned");
    expect(getDefaultAuthenticatedRoute(["users.read"])).toBe("/users");
    expect(getDefaultAuthenticatedRoute(["reports.revenue.read"])).toBe(
      "/reports",
    );
    expect(getDefaultAuthenticatedRoute(["employees.read"])).toBe("/employees");
  });
});
