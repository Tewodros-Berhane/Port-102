"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type DataColumn } from "@/components/common/DataTable";
import { LiveSearchInput } from "@/components/common/LiveSearchInput";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationControls } from "@/components/common/PaginationControls";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { useIssues } from "../_hooks/use-housekeeping";
import type { Issue, IssueStatus } from "../_types/housekeeping.types";
export function IssuesView({ session }: { session: Session }) {
  const params = useSearchParams(),
    router = useRouter(),
    allowed = hasPermission(session.permissions, "housekeeping.issues.read"),
    page = Number(params.get("page") || 1),
    search = params.get("search") || "",
    status = (params.get("status") || undefined) as IssueStatus | undefined,
    query = useIssues(
      { page, limit: 20, search: search || undefined, status },
      allowed,
    );
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    router.replace(`/housekeeping/issues?${next}`);
  };
  const columns: DataColumn<Issue>[] = [
    {
      key: "issue",
      label: "Issue",
      render: (row) => (
        <Link
          className="font-medium text-primary hover:underline"
          href={`/housekeeping/issues/${row.id}`}
        >
          {row.issueNumber}
        </Link>
      ),
    },
    { key: "title", label: "Title", render: (row) => row.title },
    {
      key: "room",
      label: "Room",
      render: (row) => row.room.displayName || row.room.roomNumber,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge
          label={row.status}
          tone={
            row.status === "RESOLVED"
              ? "success"
              : row.status === "CANCELLED"
                ? "destructive"
                : "warning"
          }
        />
      ),
    },
    {
      key: "reported",
      label: "Reported by",
      render: (row) => row.reportedBy?.fullName || "System",
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
        title="Issues"
        description="Operational issues reported while servicing rooms."
      />
      <div className="mt-5 grid gap-3 rounded-md border bg-surface p-3 sm:grid-cols-[1fr_220px]">
        <LiveSearchInput
          key={search}
          value={search}
          onSearch={(v) => set("search", v)}
          placeholder="Search issue, title, description, or room"
        />
        <select
          className="h-10 rounded-md border bg-surface px-3 text-sm"
          value={status || ""}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>
      {query.error && <QueryErrorState error={query.error} />}
      {query.isPending ? (
        <Skeleton className="mt-5 h-72" />
      ) : (
        <div className="mt-5">
          <DataTable
            rows={query.data?.items ?? []}
            columns={columns}
            getKey={(row) => row.id}
            emptyTitle="No housekeeping issues found"
          />
          <PaginationControls
            page={page}
            totalPages={query.data?.pagination.totalPages ?? 1}
            onPage={(value) => set("page", String(value))}
          />
        </div>
      )}
    </PageContainer>
  );
}
