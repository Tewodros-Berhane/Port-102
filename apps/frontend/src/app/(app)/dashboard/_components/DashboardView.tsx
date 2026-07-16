"use client";
import {
  AlertTriangle,
  BedDouble,
  CircleDollarSign,
  ClipboardCheck,
  Wrench,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePropertySettings } from "@/features/property/use-property-settings";
import { hasPermission, hasAnyPermission } from "@/lib/permissions";
import { formatCurrency } from "@/utils/format.utils";
import type { Session } from "@/types/auth.types";
import {
  useDashboard,
  useDailySummary,
  useExceptions,
} from "../_hooks/use-dashboard";
import type { ExceptionReport } from "../_types/dashboard.types";

const exceptionGroups = [
  [
    "Overdue departures",
    (value: ExceptionReport) => value.frontDesk.overdueDepartures,
  ],
  [
    "Unpaid open folios",
    (value: ExceptionReport) => value.frontDesk.unpaidOpenFolios,
  ],
  ["Out-of-order rooms", (value: ExceptionReport) => value.rooms.outOfOrder],
  [
    "Urgent maintenance",
    (value: ExceptionReport) => value.maintenance.urgentTickets,
  ],
  [
    "Overdue housekeeping",
    (value: ExceptionReport) => value.housekeeping.overdueTasks,
  ],
  [
    "Low-stock items",
    (value: ExceptionReport) => value.inventory.lowStockItems,
  ],
  [
    "Pending purchase requests",
    (value: ExceptionReport) => value.procurement.pendingPurchaseRequests,
  ],
] as const;

export function DashboardView({ session }: { session: Session }) {
  const router = useRouter();
  const params = useSearchParams();
  const filters = {
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
  };
  const canDashboard = hasPermission(
    session.permissions,
    "reports.dashboard.read",
  );
  const canDaily = hasPermission(
    session.permissions,
    "reports.daily_summary.read",
  );
  const dashboard = useDashboard(filters, canDashboard);
  const daily = useDailySummary(filters, canDaily);
  const exceptions = useExceptions(canDashboard);
  const canProperty = hasAnyPermission(session.permissions, [
    "hotel.profile.read",
    "hotel.settings.read",
  ]);
  const property = usePropertySettings(canProperty);
  const settings = {
    locale: property.data?.locale ?? "en-US",
    defaultCurrency: property.data?.defaultCurrency ?? "USD",
  };
  const setDate = (key: "from" | "to", value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/dashboard?${next}`);
  };
  if (!canDashboard && !canDaily)
    return (
      <PageContainer>
        <PermissionDeniedState />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Management overview"
        title="Executive dashboard"
        description="Current performance, the daily review, and operational exceptions from the reporting API."
        actions={
          <div className="flex flex-wrap gap-2">
            <Input
              aria-label="From date"
              type="date"
              value={filters.from ?? ""}
              onChange={(event) => setDate("from", event.target.value)}
              className="w-40"
            />
            <Input
              aria-label="To date"
              type="date"
              value={filters.to ?? ""}
              onChange={(event) => setDate("to", event.target.value)}
              className="w-40"
            />
          </div>
        }
      />
      {canDashboard &&
        (dashboard.isPending ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : dashboard.isError ? (
          <QueryErrorState
            error={dashboard.error}
            message="Executive metrics could not be loaded."
          />
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Occupancy"
                value={`${dashboard.data.rooms.occupancyRate}%`}
                detail={`${dashboard.data.rooms.occupied} occupied of ${dashboard.data.rooms.total} rooms`}
                icon={<BedDouble className="size-4" />}
              />
              <StatCard
                label="Total revenue"
                value={formatCurrency(
                  Number(dashboard.data.financial.totalRevenue),
                  settings,
                )}
                detail={`${dashboard.data.frontDesk.inHouseGuests} in-house guests`}
                icon={<CircleDollarSign className="size-4" />}
              />
              <StatCard
                label="Payments received"
                value={formatCurrency(
                  Number(dashboard.data.financial.paymentsReceived),
                  settings,
                )}
                detail={`Outstanding ${formatCurrency(Number(dashboard.data.financial.outstandingFolioBalance), settings)}`}
              />
              <StatCard
                label="Open maintenance"
                value={dashboard.data.operations.openMaintenanceTickets}
                detail={`${dashboard.data.operations.urgentMaintenanceTickets} urgent`}
                icon={<Wrench className="size-4" />}
              />
            </section>
            <section className="mt-5 grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Rooms</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <Metric label="Vacant" value={dashboard.data.rooms.vacant} />
                  <Metric label="Dirty" value={dashboard.data.rooms.dirty} />
                  <Metric
                    label="Inspected"
                    value={dashboard.data.rooms.inspected}
                  />
                  <Metric
                    label="Out of order"
                    value={dashboard.data.rooms.outOfOrder}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Front desk</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <Metric
                    label="Arrivals"
                    value={dashboard.data.frontDesk.arrivalsToday}
                  />
                  <Metric
                    label="Departures"
                    value={dashboard.data.frontDesk.departuresToday}
                  />
                  <Metric
                    label="Active stays"
                    value={dashboard.data.frontDesk.activeStays}
                  />
                  <Metric
                    label="In-house guests"
                    value={dashboard.data.frontDesk.inHouseGuests}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Operations</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <Metric
                    label="Housekeeping"
                    value={dashboard.data.operations.pendingHousekeepingTasks}
                  />
                  <Metric
                    label="Low stock"
                    value={dashboard.data.operations.lowStockItems}
                  />
                  <Metric
                    label="Purchase requests"
                    value={dashboard.data.operations.pendingPurchaseRequests}
                  />
                  <Metric
                    label="Urgent maintenance"
                    value={dashboard.data.operations.urgentMaintenanceTickets}
                  />
                </CardContent>
              </Card>
            </section>
          </>
        ))}
      {canDaily && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Daily management review</h2>
          {daily.isPending ? (
            <Skeleton className="mt-3 h-28" />
          ) : daily.isError ? (
            <QueryErrorState error={daily.error} />
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Check-ins / checkouts"
                value={`${daily.data.checkIns} / ${daily.data.checkouts}`}
                detail={`${daily.data.arrivals} arrivals · ${daily.data.departures} departures`}
                icon={<ClipboardCheck className="size-4" />}
              />
              <StatCard
                label="Reservations created"
                value={daily.data.reservationsCreated}
                detail={`${daily.data.cancellations} cancelled · ${daily.data.noShows} no-shows`}
              />
              <StatCard
                label="Folio charges"
                value={formatCurrency(
                  Number(daily.data.folioCharges),
                  settings,
                )}
                detail={`POS sales ${formatCurrency(Number(daily.data.posSales), settings)}`}
              />
              <StatCard
                label="Tasks completed"
                value={daily.data.housekeepingTasksCompleted}
                detail={`${daily.data.maintenanceTicketsCompleted} maintenance completed`}
              />
            </div>
          )}
        </section>
      )}
      {canDashboard && (
        <section className="mt-8">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" />
            <h2 className="text-lg font-semibold">Operational exceptions</h2>
          </div>
          {exceptions.isPending ? (
            <Skeleton className="mt-3 h-36" />
          ) : exceptions.isError ? (
            <QueryErrorState error={exceptions.error} />
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {exceptionGroups.map(([label, select]) => (
                <Card key={label}>
                  <CardContent className="flex items-center justify-between p-4">
                    <span className="text-sm text-foreground-muted">
                      {label}
                    </span>
                    <span className="text-xl font-semibold">
                      {select(exceptions.data).length}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </PageContainer>
  );
}
function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-surface-raised p-3">
      <p className="text-xs text-foreground-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
