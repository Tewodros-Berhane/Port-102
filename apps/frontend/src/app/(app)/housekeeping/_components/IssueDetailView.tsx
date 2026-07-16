"use client";
import { useState } from "react";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { useHousekeepingMutation, useIssue } from "../_hooks/use-housekeeping";
import { housekeepingService as api } from "../_services/housekeeping.service";
export function IssueDetailView({
  id,
  session,
}: {
  id: number;
  session: Session;
}) {
  const allowed = hasPermission(
      session.permissions,
      "housekeeping.issues.read",
    ),
    query = useIssue(id, allowed),
    [notes, setNotes] = useState(""),
    resolve = useHousekeepingMutation(
      (issueId: number) => api.resolveIssue(issueId, notes || undefined),
      "Housekeeping issue resolved.",
    ),
    cancel = useHousekeepingMutation(
      (issueId: number) => api.cancelIssue(issueId, notes),
      "Housekeeping issue cancelled.",
    );
  if (!allowed)
    return (
      <PageContainer>
        <PermissionDeniedState />
      </PageContainer>
    );
  if (query.error)
    return (
      <PageContainer>
        <QueryErrorState error={query.error} />
      </PageContainer>
    );
  if (!query.data)
    return (
      <PageContainer>
        <Skeleton className="h-72" />
      </PageContainer>
    );
  const issue = query.data;
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Housekeeping issue"
        title={issue.issueNumber}
        description={`Room ${issue.room.displayName || issue.room.roomNumber}`}
      />
      <section className="mt-5 rounded-md border bg-surface p-5">
        <StatusBadge
          label={issue.status}
          tone={
            issue.status === "RESOLVED"
              ? "success"
              : issue.status === "CANCELLED"
                ? "destructive"
                : "warning"
          }
        />
        <h2 className="mt-4 text-lg font-semibold">{issue.title}</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          {issue.description || "No description supplied."}
        </p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-foreground-muted">Reported by</dt>
            <dd>{issue.reportedBy?.fullName || "System"}</dd>
          </div>
          <div>
            <dt className="text-xs text-foreground-muted">Related task</dt>
            <dd>{issue.task?.taskNumber || "None"}</dd>
          </div>
        </dl>
        {issue.resolutionNotes && (
          <p className="mt-4 rounded-md bg-muted p-3 text-sm">
            {issue.resolutionNotes}
          </p>
        )}
        {issue.status === "OPEN" && (
          <div className="mt-5 border-t pt-5">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Resolution notes or cancellation reason"
            />
            <div className="mt-3 flex gap-2">
              <Button
                loading={resolve.isPending}
                onClick={() => resolve.mutate(id)}
              >
                Resolve issue
              </Button>
              <Button
                variant="destructive"
                disabled={!notes.trim()}
                loading={cancel.isPending}
                onClick={() =>
                  window.confirm("Cancel this issue?") && cancel.mutate(id)
                }
              >
                Cancel issue
              </Button>
            </div>
          </div>
        )}
      </section>
    </PageContainer>
  );
}
