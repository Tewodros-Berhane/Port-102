"use client";
import {
  AlertTriangle,
  Bell,
  Building2,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Contact,
  ConciergeBell,
  BrushCleaning,
  Wrench,
  CalendarDays,
  UserRoundSearch,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePropertySettings } from "@/features/property/use-property-settings";
import { hasAnyPermission } from "@/lib/permissions";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { Session } from "@/types/auth.types";

export const managementNavigation = [
  {
    label: "Maintenance",
    href: routes.maintenance,
    icon: Wrench,
    permissions: ["maintenance.dashboard.read"],
  },
  {
    label: "Tickets",
    href: routes.maintenanceTickets,
    icon: ClipboardCheck,
    permissions: ["maintenance.tickets.read"],
  },
  {
    label: "My tickets",
    href: routes.maintenanceAssigned,
    icon: Wrench,
    permissions: ["maintenance.tickets.read.assigned"],
  },
  {
    label: "Assets",
    href: routes.maintenanceAssets,
    icon: Building2,
    permissions: ["assets.read"],
  },
  {
    label: "Preventive",
    href: routes.maintenancePreventive,
    icon: CalendarDays,
    permissions: ["preventive_maintenance.read"],
  },
  {
    label: "Housekeeping",
    href: routes.housekeeping,
    icon: BrushCleaning,
    permissions: ["housekeeping.dashboard.read"],
  },
  {
    label: "Tasks",
    href: routes.housekeepingTasks,
    icon: ClipboardCheck,
    permissions: ["housekeeping.tasks.read"],
  },
  {
    label: "My housekeeping tasks",
    href: routes.housekeepingAssigned,
    icon: ClipboardCheck,
    permissions: ["housekeeping.tasks.read.assigned"],
  },
  {
    label: "Issues",
    href: routes.housekeepingIssues,
    icon: AlertTriangle,
    permissions: ["housekeeping.issues.read"],
  },
  {
    label: "Productivity",
    href: routes.housekeepingProductivity,
    icon: ChartNoAxesCombined,
    permissions: ["housekeeping.productivity.read"],
  },
  {
    label: "Front desk",
    href: routes.frontDesk,
    icon: ConciergeBell,
    permissions: ["arrivals.read", "departures.read", "in_house_guests.read"],
  },
  {
    label: "Reservations",
    href: routes.reservations,
    icon: CalendarDays,
    permissions: ["reservations.read"],
  },
  {
    label: "Guests",
    href: routes.guests,
    icon: UserRoundSearch,
    permissions: ["guests.read"],
  },
  {
    label: "Dashboard",
    href: routes.dashboard,
    icon: LayoutDashboard,
    permissions: ["reports.dashboard.read", "reports.daily_summary.read"],
  },
  {
    label: "Reports",
    href: routes.reports,
    icon: ChartNoAxesCombined,
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
  {
    label: "Approvals",
    href: routes.approvals,
    icon: ClipboardCheck,
    permissions: ["approval_requests.read"],
  },
  {
    label: "Users",
    href: routes.users,
    icon: Users,
    permissions: ["users.read"],
  },
  {
    label: "Roles",
    href: routes.roles,
    icon: ShieldCheck,
    permissions: ["roles.read"],
  },
  {
    label: "Employees",
    href: routes.employees,
    icon: Contact,
    permissions: ["employees.read"],
  },
  {
    label: "Departments",
    href: routes.departments,
    icon: UsersRound,
    permissions: ["departments.read"],
  },
  {
    label: "Audit logs",
    href: routes.auditLogs,
    icon: ScrollText,
    permissions: ["audit_logs.read"],
  },
  {
    label: "Notifications",
    href: routes.notifications,
    icon: Bell,
    permissions: ["notifications.read"],
  },
  {
    label: "Property settings",
    href: routes.propertySettings,
    icon: Settings,
    permissions: ["hotel.profile.read", "hotel.settings.read"],
  },
] as const;

export function visibleManagementRoutes(permissions: readonly string[]) {
  return managementNavigation
    .filter((item) => hasAnyPermission(permissions, item.permissions))
    .map((item) => item.href);
}

export function SidebarContent({
  session,
  collapsed = false,
  onNavigate,
}: {
  session: Session;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const canReadProperty = hasAnyPermission(session.permissions, [
    "hotel.profile.read",
    "hotel.settings.read",
  ]);
  const property = usePropertySettings(canReadProperty);
  const propertyName =
    property.data?.name ??
    (property.isPending && canReadProperty
      ? "Loading property…"
      : "Hotel operations");
  const visible = managementNavigation.filter((item) =>
    hasAnyPermission(session.permissions, item.permissions),
  );
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center" : "gap-3",
        )}
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-xs font-extrabold text-primary-foreground">
          P102
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold">Port-102</p>
            <p className="text-[11px] text-sidebar-muted">Management system</p>
          </div>
        )}
      </div>
      <div className={cn("px-3 py-4", collapsed && "px-2")}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-raised px-3 py-2.5",
            collapsed && "justify-center px-2",
          )}
        >
          <Building2 className="size-4 text-accent" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{propertyName}</p>
              <p className="text-[10px] uppercase tracking-wider text-sidebar-muted">
                Current property
              </p>
            </div>
          )}
        </div>
      </div>
      <nav
        className={cn(
          "min-h-0 flex-1 space-y-1 overflow-y-auto px-3",
          collapsed && "px-2",
        )}
        aria-label="Main navigation"
      >
        {visible.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== routes.housekeeping &&
              item.href !== routes.maintenance &&
              pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          const link = (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-muted hover:bg-sidebar-raised hover:text-sidebar-foreground",
                active &&
                  "bg-sidebar-accent text-sidebar-foreground before:absolute before:left-0 before:h-5 before:w-0.5 before:bg-accent",
                collapsed && "justify-center px-2",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
          return collapsed ? (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>
    </div>
  );
}
export function Sidebar({ session }: { session: Session }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside
      className={cn(
        "relative hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:block",
        collapsed ? "w-[68px]" : "w-[248px]",
      )}
    >
      <SidebarContent session={session} collapsed={collapsed} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed((value) => !value)}
        className="absolute -right-4 top-[76px] size-8 border bg-surface"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight /> : <ChevronLeft />}
      </Button>
    </aside>
  );
}
