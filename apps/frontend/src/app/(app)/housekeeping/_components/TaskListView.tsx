"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { LiveSearchInput } from "@/components/common/LiveSearchInput";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationControls } from "@/components/common/PaginationControls";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { QueryErrorState } from "@/components/feedback/QueryErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import type { Session } from "@/types/auth.types";
import { useAssignedTasks, useTasks } from "../_hooks/use-housekeeping";
import type { TaskStatus } from "../_types/housekeeping.types";
import { HousekeepingTaskTable } from "./HousekeepingTaskTable";
import { TaskActions } from "./TaskActions";
import { TaskRoomControls } from "./TaskRoomControls";
import { CreateTaskPanel } from "./CreateTaskPanel";
const statuses: TaskStatus[] = [
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "INSPECTION_PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];
export function TaskListView({
  session,
  assigned = false,
}: {
  session: Session;
  assigned?: boolean;
}) {
  const params = useSearchParams(),
    router = useRouter();
  const page = Number(params.get("page") || 1),
    search = params.get("search") || "",
    status = (params.get("status") || undefined) as TaskStatus | undefined;
  const allowed = assigned
    ? hasAnyPermission(session.permissions, [
        "housekeeping.tasks.read",
        "housekeeping.tasks.read.assigned",
      ])
    : hasPermission(session.permissions, "housekeeping.tasks.read");
  const queryArgs = { page, limit: 20, search: search || undefined, status };
  const all = useTasks(queryArgs, allowed && !assigned),
    mine = useAssignedTasks(queryArgs, allowed && assigned),
    query = assigned ? mine : all;
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    router.replace(
      `${assigned ? "/housekeeping/assigned" : "/housekeeping/tasks"}?${next}`,
    );
  };
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
        title={assigned ? "My tasks" : "Housekeeping tasks"}
        description={
          assigned
            ? "Your assigned work, ordered by the backend."
            : "Search and filter the hotel’s housekeeping workload."
        }
        actions={
          !assigned &&
          hasPermission(session.permissions, "housekeeping.tasks.create") ? (
            <CreateTaskPanel />
          ) : undefined
        }
      />
      <div className="mt-5 grid gap-3 rounded-md border bg-surface p-3 sm:grid-cols-[1fr_220px]">
        <LiveSearchInput
          key={search}
          value={search}
          onSearch={(v) => set("search", v)}
          placeholder="Search task, room, notes, or assignee"
        />
        <select
          aria-label="Task status"
          className="h-10 rounded-md border bg-surface px-3 text-sm"
          value={status || ""}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      {query.error && <QueryErrorState error={query.error} />}
      {query.isPending ? (
        <Skeleton className="mt-5 h-72" />
      ) : (
        <div className="mt-5">
          <HousekeepingTaskTable
            rows={query.data?.items ?? []}
            detailLinks={
              !assigned ||
              hasPermission(session.permissions, "housekeeping.tasks.read")
            }
            actions={
              assigned
                ? (task) => (
                    <div className="min-w-60 space-y-2">
                      <TaskActions compact task={task} session={session} />
                      <TaskRoomControls task={task} session={session} />
                    </div>
                  )
                : undefined
            }
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
