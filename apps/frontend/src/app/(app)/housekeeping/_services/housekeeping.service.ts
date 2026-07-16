import { apiClient } from "@/lib/api-client";
import type {
  CleaningStatus,
  Assignee,
  CreateIssuePayload,
  CreateTaskPayload,
  Dashboard,
  Issue,
  IssueQuery,
  ListResponse,
  Productivity,
  Task,
  TaskQuery,
} from "../_types/housekeeping.types";

export const housekeepingService = {
  assignees: (search?: string) =>
    apiClient.get<Assignee[]>("proxy/housekeeping/assignees", {
      page: 1,
      limit: 20,
      search,
    }),
  dashboard: (date?: string) =>
    apiClient.get<Dashboard>("proxy/housekeeping/dashboard", { date }),
  productivity: (from?: string, to?: string) =>
    apiClient.get<Productivity>("proxy/housekeeping/productivity", {
      from,
      to,
    }),
  tasks: (query: TaskQuery) =>
    apiClient.get<ListResponse<Task>>("proxy/housekeeping/tasks", query),
  assigned: (query: TaskQuery) =>
    apiClient.get<ListResponse<Task>>(
      "proxy/housekeeping/tasks/assigned/me",
      query,
    ),
  task: (id: number) => apiClient.get<Task>(`proxy/housekeeping/tasks/${id}`),
  createTask: (body: CreateTaskPayload) =>
    apiClient.post<Task>("proxy/housekeeping/tasks", body),
  assign: (id: number, assignedToUserId: number, notes?: string | null) =>
    apiClient.patch<Task>(`proxy/housekeeping/tasks/${id}/assign`, {
      assignedToUserId,
      notes,
    }),
  reassign: (id: number, assignedToUserId: number, notes?: string | null) =>
    apiClient.patch<Task>(`proxy/housekeeping/tasks/${id}/reassign`, {
      assignedToUserId,
      notes,
    }),
  start: (id: number, notes?: string | null) =>
    apiClient.patch<Task>(`proxy/housekeeping/tasks/${id}/start`, { notes }),
  complete: (id: number, completionNotes?: string | null) =>
    apiClient.patch<Task>(`proxy/housekeeping/tasks/${id}/complete`, {
      completionNotes,
    }),
  inspect: (id: number, inspectionNotes?: string | null) =>
    apiClient.patch<Task>(`proxy/housekeeping/tasks/${id}/inspect`, {
      inspectionNotes,
    }),
  approve: (id: number, inspectionNotes?: string | null) =>
    apiClient.patch<Task>(`proxy/housekeeping/tasks/${id}/approve`, {
      inspectionNotes,
    }),
  reject: (id: number, reason: string, inspectionNotes?: string | null) =>
    apiClient.patch<Task>(`proxy/housekeeping/tasks/${id}/reject`, {
      reason,
      inspectionNotes,
    }),
  cancelTask: (id: number, reason: string) =>
    apiClient.patch<Task>(`proxy/housekeeping/tasks/${id}/cancel`, { reason }),
  issues: (query: IssueQuery) =>
    apiClient.get<ListResponse<Issue>>("proxy/housekeeping/issues", query),
  issue: (id: number) =>
    apiClient.get<Issue>(`proxy/housekeeping/issues/${id}`),
  reportIssue: (body: CreateIssuePayload) =>
    apiClient.post<Issue>("proxy/housekeeping/issues", body),
  resolveIssue: (id: number, resolutionNotes?: string | null) =>
    apiClient.patch<Issue>(`proxy/housekeeping/issues/${id}/resolve`, {
      resolutionNotes,
    }),
  cancelIssue: (id: number, reason: string) =>
    apiClient.patch<Issue>(`proxy/housekeeping/issues/${id}/cancel`, {
      reason,
    }),
  updateCleaning: (
    roomId: number,
    cleaningStatus: CleaningStatus,
    reason?: string | null,
  ) =>
    apiClient.patch<unknown>(
      `proxy/housekeeping/rooms/${roomId}/cleaning-status`,
      { cleaningStatus, reason },
    ),
};
