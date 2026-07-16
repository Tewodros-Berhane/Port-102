import { describe, expect, it } from "vitest";
import { routes } from "@/lib/routes";
import { visibleManagementRoutes } from "./Sidebar";

describe("management permission matrix", () => {
  it("gives HOTEL_OWNER strategic read routes without admin settings updates", () => {
    const visible = visibleManagementRoutes([
      "reports.dashboard.read",
      "reports.revenue.read",
      "approval_requests.read",
      "users.read",
      "roles.read",
      "employees.read",
      "departments.read",
      "audit_logs.read",
      "notifications.read",
      "hotel.profile.read",
    ]);
    expect(visible).toEqual(
      expect.arrayContaining([
        routes.dashboard,
        routes.reports,
        routes.approvals,
        routes.users,
        routes.roles,
        routes.employees,
        routes.departments,
        routes.auditLogs,
        routes.notifications,
        routes.propertySettings,
      ]),
    );
  });
  it("gives HOTEL_ADMIN administration and dashboard routes", () => {
    const visible = visibleManagementRoutes([
      "reports.dashboard.read",
      "users.read",
      "roles.read",
      "employees.read",
      "departments.read",
      "audit_logs.read",
      "notifications.read",
      "hotel.settings.read",
    ]);
    expect(visible).toEqual(
      expect.arrayContaining([
        routes.dashboard,
        routes.users,
        routes.roles,
        routes.employees,
        routes.departments,
        routes.auditLogs,
        routes.notifications,
        routes.propertySettings,
      ]),
    );
    expect(visible).not.toContain(routes.approvals);
  });
  it("gives GENERAL_MANAGER operational management reads without administration", () => {
    const visible = visibleManagementRoutes([
      "reports.dashboard.read",
      "reports.occupancy.read",
      "approval_requests.read",
      "employees.read",
      "departments.read",
      "audit_logs.read",
      "notifications.read",
      "hotel.profile.read",
    ]);
    expect(visible).toEqual(
      expect.arrayContaining([
        routes.dashboard,
        routes.reports,
        routes.approvals,
        routes.employees,
        routes.departments,
        routes.auditLogs,
        routes.notifications,
        routes.propertySettings,
      ]),
    );
    expect(visible).not.toContain(routes.users);
    expect(visible).not.toContain(routes.roles);
  });
  it("gives FRONT_DESK_CASHIER only the shared operational feature routes", () => {
    const visible = visibleManagementRoutes([
      "arrivals.read",
      "departures.read",
      "in_house_guests.read",
      "reservations.read",
      "guests.read",
    ]);
    expect(visible).toEqual([
      routes.frontDesk,
      routes.reservations,
      routes.guests,
    ]);
  });
});
