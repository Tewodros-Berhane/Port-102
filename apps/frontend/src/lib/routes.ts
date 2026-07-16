export const routes = {
  login: "/login",
  dashboard: "/dashboard",
  frontDesk: "/front-desk",
  reservations: "/reservations",
  guests: "/guests",
  stays: "/stays",
  housekeeping: "/housekeeping",
  housekeepingTasks: "/housekeeping/tasks",
  housekeepingAssigned: "/housekeeping/assigned",
  housekeepingIssues: "/housekeeping/issues",
  housekeepingProductivity: "/housekeeping/productivity",
  maintenance: "/maintenance",
  maintenanceTickets: "/maintenance/tickets",
  maintenanceAssigned: "/maintenance/assigned",
  maintenanceAssets: "/maintenance/assets",
  maintenancePreventive: "/maintenance/preventive",
  reports: "/reports",
  approvals: "/approvals",
  users: "/users",
  roles: "/roles",
  employees: "/employees",
  departments: "/departments",
  auditLogs: "/audit-logs",
  notifications: "/notifications",
  propertySettings: "/settings/property",
} as const;

const landingRoutes = [
  {
    href: routes.dashboard,
    permissions: ["reports.dashboard.read", "reports.daily_summary.read"],
  },
  {
    href: routes.frontDesk,
    permissions: ["arrivals.read", "departures.read", "in_house_guests.read"],
  },
  {
    href: routes.housekeeping,
    permissions: ["housekeeping.dashboard.read", "housekeeping.tasks.read"],
  },
  {
    href: routes.housekeepingAssigned,
    permissions: ["housekeeping.tasks.read.assigned"],
  },
  { href: routes.reservations, permissions: ["reservations.read"] },
  { href: routes.guests, permissions: ["guests.read"] },
  {
    href: routes.reports,
    permissions: [
      "reports.occupancy.read",
      "reports.revenue.read",
      "reports.payment_summary.read",
      "reports.department_performance.read",
      "reports.housekeeping.read",
      "reports.maintenance.read",
      "reports.outlet_sales.read",
      "reports.inventory.read",
      "reports.procurement.read",
    ],
  },
  { href: routes.users, permissions: ["users.read"] },
  { href: routes.employees, permissions: ["employees.read"] },
  { href: routes.departments, permissions: ["departments.read"] },
  { href: routes.auditLogs, permissions: ["audit_logs.read"] },
  {
    href: routes.propertySettings,
    permissions: ["hotel.profile.read", "hotel.settings.read"],
  },
  { href: routes.notifications, permissions: ["notifications.read"] },
] as const;

export function getDefaultAuthenticatedRoute(permissions: readonly string[]) {
  return (
    landingRoutes.find((route) =>
      route.permissions.some((permission) => permissions.includes(permission)),
    )?.href ?? routes.notifications
  );
}
