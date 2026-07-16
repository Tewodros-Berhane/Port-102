"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { useHousekeepingMutation } from "../_hooks/use-housekeeping";
import { housekeepingService as api } from "../_services/housekeeping.service";
import type { CleaningStatus, Task } from "../_types/housekeeping.types";
export function TaskRoomControls({
  task,
  session,
}: {
  task: Task;
  session: Session;
}) {
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [cleaningStatus, setCleaningStatus] = useState<CleaningStatus>(
      task.room.cleaningStatus,
    );
  const report = useHousekeepingMutation(
    () =>
      api.reportIssue({
        roomId: task.roomId,
        taskId: task.id,
        title,
        description: description || undefined,
      }),
    "Housekeeping issue reported.",
  );
  const clean = useHousekeepingMutation(
    () =>
      api.updateCleaning(
        task.roomId,
        cleaningStatus,
        "Manual housekeeping status update",
      ),
    "Room cleaning status updated.",
  );
  const canReport = hasPermission(
    session.permissions,
    "housekeeping.issues.report",
  );
  const canClean =
    hasAnyPermission(session.permissions, [
      "room_cleaning_status.update",
      "room_cleaning_status.update.assigned",
    ]) &&
    (hasPermission(session.permissions, "room_cleaning_status.update") ||
      task.assignedToUserId === session.id);
  if (!canReport && !canClean) return null;
  return (
    <section className="rounded-md border bg-surface p-4">
      <h2 className="font-semibold">Room operations</h2>
      {canReport && (
        <div className="mt-3 space-y-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Issue description (optional)"
          />
          <Button
            variant="secondary"
            disabled={!title.trim()}
            loading={report.isPending}
            onClick={() => report.mutate(undefined)}
          >
            Report issue
          </Button>
        </div>
      )}
      {canClean && (
        <div className="mt-4 border-t pt-4">
          <label
            className="text-xs text-foreground-muted"
            htmlFor="cleaning-status"
          >
            Manual room cleaning status
          </label>
          <div className="mt-2 flex gap-2">
            <select
              id="cleaning-status"
              className="h-10 flex-1 rounded-md border bg-surface px-3 text-sm"
              value={cleaningStatus}
              onChange={(e) =>
                setCleaningStatus(e.target.value as CleaningStatus)
              }
            >
              <option value="DIRTY">DIRTY</option>
              <option value="CLEAN">CLEAN</option>
              <option value="INSPECTED">INSPECTED</option>
            </select>
            <Button
              disabled={cleaningStatus === task.room.cleaningStatus}
              loading={clean.isPending}
              onClick={() =>
                window.confirm(
                  "Manually override this room’s cleaning status?",
                ) && clean.mutate(undefined)
              }
            >
              Update
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
