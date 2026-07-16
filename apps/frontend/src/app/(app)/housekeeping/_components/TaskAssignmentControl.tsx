"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { useHousekeepingMutation } from "../_hooks/use-housekeeping";
import { housekeepingService as api } from "../_services/housekeeping.service";
import type { Task } from "../_types/housekeeping.types";

export function TaskAssignmentControl({
  task,
  session,
}: {
  task: Task;
  session: Session;
}) {
  const canAssign =
    task.assignedToUserId === null &&
    hasPermission(session.permissions, "housekeeping.tasks.assign");
  const canReassign =
    task.assignedToUserId !== null &&
    hasPermission(session.permissions, "housekeeping.tasks.reassign");
  const canReadAssignees = hasPermission(
    session.permissions,
    "housekeeping.assignees.read",
  );
  const [search, setSearch] = useState(""),
    [assigneeId, setAssigneeId] = useState<number | null>(
      task.assignedToUserId,
    );
  const assignees = useQuery({
    queryKey: ["housekeeping", "assignees", search],
    queryFn: () => api.assignees(search || undefined),
    enabled: canReadAssignees && (canAssign || canReassign),
  });
  const assign = useHousekeepingMutation(
    (id: number) =>
      canReassign ? api.reassign(task.id, id) : api.assign(task.id, id),
    canReassign
      ? "Housekeeping task reassigned."
      : "Housekeeping task assigned.",
  );
  if (!canReadAssignees || (!canAssign && !canReassign)) return null;
  return (
    <section className="rounded-md border bg-surface p-4">
      <h2 className="font-semibold">
        {canReassign ? "Reassign task" : "Assign task"}
      </h2>
      <div className="mt-3 space-y-3">
        <SearchableSelect
          value={assigneeId}
          onChange={setAssigneeId}
          onSearchChange={setSearch}
          loading={assignees.isFetching}
          options={(assignees.data ?? []).map((user) => ({
            value: user.id,
            label: user.fullName,
            description: user.employeeNumber
              ? `${user.employeeNumber} · ${user.email}`
              : user.email,
          }))}
          placeholder="Select an attendant"
          searchPlaceholder="Search attendants"
          required
        />
        <Button
          disabled={!assigneeId || assigneeId === task.assignedToUserId}
          loading={assign.isPending}
          onClick={() => assigneeId && assign.mutate(assigneeId)}
        >
          {canReassign ? "Reassign" : "Assign"}
        </Button>
      </div>
    </section>
  );
}
