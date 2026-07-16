"use client";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { useTask } from "../_hooks/use-housekeeping";
import { taskTone } from "./HousekeepingTaskTable";
import { TaskActions } from "./TaskActions";
import { TaskRoomControls } from "./TaskRoomControls";
import { TaskAssignmentControl } from "./TaskAssignmentControl";
export function TaskDetailView({
  id,
  session,
}: {
  id: number;
  session: Session;
}) {
  const allowed = hasPermission(session.permissions, "housekeeping.tasks.read"),
    query = useTask(id, allowed);
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
        <Skeleton className="h-80" />
      </PageContainer>
    );
  const task = query.data;
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Housekeeping task"
        title={task.taskNumber}
        description={`Room ${task.room.displayName || task.room.roomNumber}`}
      />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="rounded-md border bg-surface p-5">
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              label={task.status.replaceAll("_", " ")}
              tone={taskTone(task.status)}
            />
            <StatusBadge
              label={task.priority}
              tone={task.priority === "URGENT" ? "destructive" : "neutral"}
            />
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Detail label="Type" value={task.type.replaceAll("_", " ")} />
            <Detail
              label="Assigned attendant"
              value={task.assignedTo?.fullName || "Unassigned"}
            />
            <Detail
              label="Room cleaning state"
              value={task.room.cleaningStatus}
            />
            <Detail
              label="Created"
              value={new Date(task.createdAt).toLocaleString()}
            />
            <Detail
              label="Started"
              value={
                task.startedAt
                  ? new Date(task.startedAt).toLocaleString()
                  : "Not started"
              }
            />
            <Detail
              label="Completed"
              value={
                task.completedAt
                  ? new Date(task.completedAt).toLocaleString()
                  : "Not completed"
              }
            />
          </dl>
          {task.notes && (
            <p className="mt-5 rounded-md bg-muted p-3 text-sm">{task.notes}</p>
          )}
          {task.completionNotes && (
            <p className="mt-3 text-sm">
              <b>Completion:</b> {task.completionNotes}
            </p>
          )}
          {task.inspectionNotes && (
            <p className="mt-3 text-sm">
              <b>Inspection:</b> {task.inspectionNotes}
            </p>
          )}
          {task.rejectionReason && (
            <p className="mt-3 text-sm text-destructive">
              <b>Rejection:</b> {task.rejectionReason}
            </p>
          )}
        </section>
        <div className="space-y-5">
          <TaskAssignmentControl task={task} session={session} />
          <TaskActions task={task} session={session} />
          <TaskRoomControls task={task} session={session} />
        </div>
      </div>
    </PageContainer>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-foreground-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
