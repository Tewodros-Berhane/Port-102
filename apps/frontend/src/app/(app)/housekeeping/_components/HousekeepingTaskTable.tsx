"use client";
import Link from "next/link";
import { DataTable, type DataColumn } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { Task } from "../_types/housekeeping.types";

const label = (value: string) => value.replaceAll("_", " ");
export const taskTone = (status: string) =>
  status === "APPROVED"
    ? ("success" as const)
    : status === "CANCELLED" || status === "REJECTED"
      ? ("destructive" as const)
      : status === "IN_PROGRESS" || status === "INSPECTION_PENDING"
        ? ("warning" as const)
        : ("neutral" as const);
export function HousekeepingTaskTable({
  rows,
  detailLinks = true,
  actions,
}: {
  rows: Task[];
  detailLinks?: boolean;
  actions?: (task: Task) => React.ReactNode;
}) {
  const columns: DataColumn<Task>[] = [
    {
      key: "task",
      label: "Task",
      render: (row) =>
        detailLinks ? (
          <Link
            className="font-medium text-primary hover:underline"
            href={`/housekeeping/tasks/${row.id}`}
          >
            {row.taskNumber}
          </Link>
        ) : (
          <span className="font-medium">{row.taskNumber}</span>
        ),
    },
    {
      key: "room",
      label: "Room",
      render: (row) => row.room.displayName || row.room.roomNumber,
    },
    { key: "type", label: "Type", render: (row) => label(row.type) },
    {
      key: "priority",
      label: "Priority",
      render: (row) => (
        <StatusBadge
          label={label(row.priority)}
          tone={
            row.priority === "URGENT"
              ? "destructive"
              : row.priority === "HIGH"
                ? "warning"
                : "neutral"
          }
        />
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge label={label(row.status)} tone={taskTone(row.status)} />
      ),
    },
    {
      key: "assignee",
      label: "Assigned to",
      render: (row) => row.assignedTo?.fullName ?? "Unassigned",
    },
  ];
  if (actions)
    columns.push({ key: "actions", label: "Next action", render: actions });
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getKey={(row) => row.id}
      emptyTitle="No housekeeping tasks found"
    />
  );
}
