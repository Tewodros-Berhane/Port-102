"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataColumn } from "@/components/common/DataTable";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { useProductivity } from "../_hooks/use-housekeeping";
import type { Productivity } from "../_types/housekeeping.types";
type Row = Productivity["items"][number];
export function ProductivityView({ session }: { session: Session }) {
  const params = useSearchParams(),
    router = useRouter(),
    allowed = hasPermission(
      session.permissions,
      "housekeeping.productivity.read",
    ),
    from = params.get("from") || new Date().toISOString().slice(0, 10),
    to = params.get("to") || from,
    query = useProductivity(from, to, allowed);
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    router.replace(`/housekeeping/productivity?${next}`);
  };
  const columns: DataColumn<Row>[] = [
    {
      key: "attendant",
      label: "Attendant",
      render: (r) => r.attendant.fullName,
    },
    { key: "assigned", label: "Assigned", render: (r) => r.assignedCount },
    { key: "completed", label: "Completed", render: (r) => r.completedCount },
    { key: "approved", label: "Approved", render: (r) => r.approvedCount },
    { key: "rejected", label: "Rejected", render: (r) => r.rejectedCount },
    {
      key: "average",
      label: "Avg. minutes",
      render: (r) => r.averageCompletionMinutes ?? "—",
    },
  ];
  if (!allowed)
    return (
      <PageContainer>
        <PermissionDeniedState />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Housekeeping"
        title="Productivity"
        description="Backend-calculated operational counts and completion time by attendant."
      />
      <div className="mt-5 flex gap-3">
        <Input
          aria-label="From date"
          type="date"
          value={from}
          onChange={(e) => set("from", e.target.value)}
        />
        <Input
          aria-label="To date"
          type="date"
          value={to}
          onChange={(e) => set("to", e.target.value)}
        />
      </div>
      {query.error && <QueryErrorState error={query.error} />}
      {query.isPending ? (
        <Skeleton className="mt-5 h-64" />
      ) : (
        <div className="mt-5">
          <DataTable
            rows={query.data?.items ?? []}
            columns={columns}
            getKey={(r) => r.attendant.id}
            emptyTitle="No productivity records for this range"
          />
        </div>
      )}
    </PageContainer>
  );
}
