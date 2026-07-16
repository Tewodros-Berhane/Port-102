"use client";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { getReport } from "../_services/reports.service";
const reports = [
  ["occupancy", "Occupancy", "reports.occupancy.read"],
  [
    "arrivals-departures",
    "Arrivals & departures",
    "reports.arrivals_departures.read",
  ],
  ["room-status", "Room status", "reports.room_status.read"],
  ["revenue", "Revenue", "reports.revenue.read"],
  ["payments", "Payments", "reports.payment_summary.read"],
  [
    "department-performance",
    "Department performance",
    "reports.department_performance.read",
  ],
  ["housekeeping", "Housekeeping", "reports.housekeeping.read"],
  ["maintenance", "Maintenance", "reports.maintenance.read"],
  ["outlet-sales", "Outlet sales", "reports.outlet_sales.read"],
  ["inventory", "Inventory", "reports.inventory.read"],
  ["procurement", "Procurement", "reports.procurement.read"],
] as const;
const label = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());
export function ReportsView({ session }: { session: Session }) {
  const params = useSearchParams(),
    router = useRouter(),
    visible = reports.filter((r) => hasPermission(session.permissions, r[2])),
    selected = visible.find((r) => r[0] === params.get("report")) ?? visible[0];
  const filters = {
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    groupBy:
      (params.get("groupBy") as "day" | "week" | "month" | null) ?? undefined,
  };
  const q = useQuery({
    queryKey: ["reports", selected?.[0], filters],
    queryFn: () => getReport(selected![0], filters),
    enabled: !!selected,
  });
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/reports?${next}`);
  };
  if (!selected)
    return (
      <PageContainer>
        <PermissionDeniedState />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Management"
        title="Consolidated reports"
        description="Backend-aggregated hotel analysis with shareable date filters."
      />
      <div className="mt-5 flex flex-wrap gap-2">
        {visible.map(([id, name]) => (
          <Button
            key={id}
            size="sm"
            variant={selected[0] === id ? "default" : "outline"}
            onClick={() => set("report", id)}
          >
            {name}
          </Button>
        ))}
      </div>
      <div className="my-4 flex flex-wrap gap-2">
        <Input
          className="w-40"
          type="date"
          aria-label="From date"
          value={filters.from ?? ""}
          onChange={(e) => set("from", e.target.value)}
        />
        <Input
          className="w-40"
          type="date"
          aria-label="To date"
          value={filters.to ?? ""}
          onChange={(e) => set("to", e.target.value)}
        />
      </div>
      {q.isPending ? (
        <Skeleton className="h-80" />
      ) : q.isError ? (
        <QueryErrorState error={q.error} />
      ) : (
        <ReportObject value={q.data} />
      )}
    </PageContainer>
  );
}
function ReportObject({ value }: { value: Record<string, unknown> }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Object.entries(value).map(([key, item]) => (
        <Card key={key} className={Array.isArray(item) ? "lg:col-span-2" : ""}>
          <CardHeader>
            <CardTitle>{label(key)}</CardTitle>
          </CardHeader>
          <CardContent>
            {item !== null &&
            typeof item === "object" &&
            !Array.isArray(item) ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(item as Record<string, unknown>).map(
                  ([nested, nestedValue]) => (
                    <div
                      key={nested}
                      className="rounded-md bg-surface-raised p-3"
                    >
                      <p className="text-xs text-foreground-muted">
                        {label(nested)}
                      </p>
                      <p className="mt-1 font-medium">
                        {typeof nestedValue === "object"
                          ? JSON.stringify(nestedValue)
                          : String(nestedValue)}
                      </p>
                    </div>
                  ),
                )}
              </div>
            ) : Array.isArray(item) ? (
              <div className="overflow-x-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(item, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-2xl font-semibold">{String(item ?? "—")}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
