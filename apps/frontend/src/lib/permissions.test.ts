import { describe, expect, it } from "vitest";
import { hasAllPermissions, hasAnyPermission, hasPermission } from "./permissions";
describe("permission utilities", () => {
  const permissions = ["hotel.profile.read", "notifications.read"];
  it("checks one permission", () => expect(hasPermission(permissions, "notifications.read")).toBe(true));
  it("checks any permission", () => expect(hasAnyPermission(permissions, ["users.read", "hotel.profile.read"])).toBe(true));
  it("checks all permissions", () => expect(hasAllPermissions(permissions, ["hotel.profile.read", "notifications.read"])).toBe(true));
});
