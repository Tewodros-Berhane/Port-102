"use client";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataColumn } from "@/components/common/DataTable";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationControls } from "@/components/common/PaginationControls";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { getAuditLogs } from "../_services/audit.service";
import type { AuditRow } from "../_types/audit.types";
const columns: DataColumn<AuditRow>[] = [
  {
    key: "time",
    label: "Timestamp",
    render: (r) => new Date(r.createdAt).toLocaleString(),
  },
  {
    key: "actor",
    label: "Actor",
    render: (r) => r.actor?.user.fullName ?? "System",
  },
  {
    key: "action",
    label: "Action",
    render: (r) => <code className="text-xs">{r.action}</code>,
  },
  {
    key: "entity",
    label: "Entity",
    render: (r) =>
      r.entityType ? `${r.entityType} · ${r.entityId ?? "—"}` : "—",
  },
];
export function AuditLogsView({ session }: { session: Session }) {
  const p = useSearchParams(),
    router = useRouter(),
    allowed = hasPermission(session.permissions, "audit_logs.read"),
    page = Number(p.get("page") || 1);
  const q = useQuery({
    queryKey: ["audit-logs", "list", { page }],
    queryFn: () => getAuditLogs({ page, pageSize: 20 }),
    enabled: allowed,
  });
  if (!allowed)
    return (
      <PageContainer>
        <PermissionDeniedState />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Administration"
        title="Audit logs"
        description="Read-only activity history. Sensitive metadata is not rendered in the list."
      />
      {q.isPending ? (
        <Skeleton className="mt-5 h-72" />
      ) : q.isError ? (
        <QueryErrorState error={q.error} />
      ) : (
        <div className="mt-5">
          <DataTable
            rows={q.data.items}
            columns={columns}
            getKey={(r) => r.id}
            emptyTitle="No audit events found"
          />
          <PaginationControls
            page={page}
            totalPages={q.data.pagination.totalPages}
            onPage={(v) => router.replace(`/audit-logs?page=${v}`)}
          />
        </div>
      )}
    </PageContainer>
  );
}
