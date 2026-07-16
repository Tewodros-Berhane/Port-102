import { describe, expect, it } from "vitest";
import { visibleManagementRoutes } from "./Sidebar";
describe("maintenance navigation", () => {
  it("shows supervisor routes from real permissions", () => {
    const routes = visibleManagementRoutes([
      "maintenance.dashboard.read",
      "maintenance.tickets.read",
      "assets.read",
      "preventive_maintenance.read",
    ]);
    expect(routes).toEqual(
      expect.arrayContaining([
        "/maintenance",
        "/maintenance/tickets",
        "/maintenance/assets",
        "/maintenance/preventive",
      ]),
    );
  });
  it("shows technicians only their assigned route", () => {
    const routes = visibleManagementRoutes([
      "maintenance.tickets.read.assigned",
    ]);
    expect(routes).toContain("/maintenance/assigned");
    expect(routes).not.toContain("/maintenance/tickets");
  });
});
