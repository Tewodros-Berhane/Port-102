"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DataTable, type DataColumn } from "@/components/common/DataTable";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { decideApproval, getApprovals } from "../_services/approvals.service";
import type { ApprovalRow } from "../_types/approvals.types";
export function ApprovalsView({ session }: { session: Session }) {
  const client = useQueryClient(),
    read = hasPermission(session.permissions, "approval_requests.read"),
    approve = hasPermission(session.permissions, "approval_requests.approve"),
    reject = hasPermission(session.permissions, "approval_requests.reject");
  const q = useQuery({
    queryKey: ["approvals", "list", { page: 1 }],
    queryFn: () => getApprovals({ page: 1, pageSize: 100 }),
    enabled: read,
  });
  const mutation = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: number;
      decision: "approve" | "reject";
    }) => decideApproval(id, decision),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["approvals", "list"] });
      client.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
  const columns: DataColumn<ApprovalRow>[] = [
    {
      key: "request",
      label: "Request",
      render: (r) => (
        <div>
          <p className="font-medium">{r.title}</p>
          <p className="text-xs text-foreground-muted">
            {r.type.replaceAll("_", " ")}
          </p>
        </div>
      ),
    },
    {
      key: "requester",
      label: "Requested by",
      render: (r) => r.requestedBy.user.fullName,
    },
    { key: "status", label: "Status", render: (r) => r.status },
    {
      key: "created",
      label: "Created",
      render: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "",
      render: (r) =>
        r.status === "PENDING" ? (
          <div className="flex gap-2">
            {approve && (
              <Button
                size="sm"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({ id: r.id, decision: "approve" })
                }
              >
                Approve
              </Button>
            )}
            {reject && (
              <Button
                size="sm"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({ id: r.id, decision: "reject" })
                }
              >
                Reject
              </Button>
            )}
          </div>
        ) : null,
    },
  ];
  if (!read)
    return (
      <PageContainer>
        <PermissionDeniedState />
      </PageContainer>
    );
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Management"
        title="Approval requests"
        description="Review and decide only backend-supported pending requests."
      />
      {mutation.isError && <QueryErrorState error={mutation.error} />}{" "}
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
            emptyTitle="No approval requests"
          />
        </div>
      )}
    </PageContainer>
  );
}
