"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { useHousekeepingMutation } from "../_hooks/use-housekeeping";
import { housekeepingService as api } from "../_services/housekeeping.service";
import type { Task } from "../_types/housekeeping.types";

export function TaskActions({
  task,
  session,
  compact = false,
}: {
  task: Task;
  session: Session;
  compact?: boolean;
}) {
  const [notes, setNotes] = useState("");
  const start = useHousekeepingMutation(
    (id: number) => api.start(id, notes || undefined),
    "Housekeeping task started.",
  );
  const complete = useHousekeepingMutation(
    (id: number) => api.complete(id, notes || undefined),
    "Housekeeping task submitted for inspection.",
  );
  const inspect = useHousekeepingMutation(
    (id: number) => api.inspect(id, notes || undefined),
    "Task inspection recorded.",
  );
  const approve = useHousekeepingMutation(
    (id: number) => api.approve(id, notes || undefined),
    "Housekeeping task approved.",
  );
  const reject = useHousekeepingMutation(
    (id: number) => api.reject(id, notes),
    "Housekeeping task rejected.",
  );
  const cancel = useHousekeepingMutation(
    (id: number) => api.cancelTask(id, notes),
    "Housekeeping task cancelled.",
  );
  const assignedToMe = task.assignedToUserId === session.id;
  const canStart =
    task.status === "ASSIGNED" &&
    (hasPermission(session.permissions, "housekeeping.tasks.start") ||
      (assignedToMe &&
        hasPermission(
          session.permissions,
          "housekeeping.tasks.start.assigned",
        )));
  const canComplete =
    ["IN_PROGRESS", "REJECTED"].includes(task.status) &&
    (hasPermission(session.permissions, "housekeeping.tasks.complete") ||
      (assignedToMe &&
        hasPermission(
          session.permissions,
          "housekeeping.tasks.complete.assigned",
        )));
  const canInspect =
    task.status === "INSPECTION_PENDING" &&
    hasPermission(session.permissions, "housekeeping.tasks.inspect");
  const canApprove =
    task.status === "INSPECTION_PENDING" &&
    hasPermission(session.permissions, "housekeeping.tasks.approve");
  const canCancel =
    !["APPROVED", "CANCELLED"].includes(task.status) &&
    hasAnyPermission(session.permissions, [
      "housekeeping.tasks.assign",
      "housekeeping.tasks.reassign",
    ]);
  if (compact)
    return (
      <div className="flex gap-2">
        {canStart && (
          <Button
            size="sm"
            loading={start.isPending}
            onClick={() => start.mutate(task.id)}
          >
            Start
          </Button>
        )}
        {canComplete && (
          <Button
            size="sm"
            loading={complete.isPending}
            onClick={() => complete.mutate(task.id)}
          >
            Complete
          </Button>
        )}
      </div>
    );
  const needsNotes = canInspect || canApprove || canCancel;
  return (
    <section className="rounded-md border bg-surface p-4">
      <h2 className="font-semibold">Actions</h2>
      {(needsNotes || canStart || canComplete) && (
        <Input
          className="mt-3"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={
            canCancel ? "Notes or required reason" : "Optional notes"
          }
        />
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {canStart && (
          <Button
            loading={start.isPending}
            onClick={() => start.mutate(task.id)}
          >
            Start task
          </Button>
        )}
        {canComplete && (
          <Button
            loading={complete.isPending}
            onClick={() => complete.mutate(task.id)}
          >
            Complete task
          </Button>
        )}
        {canInspect && (
          <Button
            variant="secondary"
            loading={inspect.isPending}
            onClick={() => inspect.mutate(task.id)}
          >
            Record inspection
          </Button>
        )}
        {canApprove && (
          <Button
            loading={approve.isPending}
            onClick={() => approve.mutate(task.id)}
          >
            Approve
          </Button>
        )}
        {canApprove && (
          <Button
            variant="destructive"
            disabled={!notes.trim()}
            loading={reject.isPending}
            onClick={() => reject.mutate(task.id)}
          >
            Reject
          </Button>
        )}
        {canCancel && (
          <Button
            variant="destructive"
            disabled={!notes.trim()}
            loading={cancel.isPending}
            onClick={() =>
              window.confirm("Cancel this housekeeping task?") &&
              cancel.mutate(task.id)
            }
          >
            Cancel task
          </Button>
        )}
      </div>
    </section>
  );
}
