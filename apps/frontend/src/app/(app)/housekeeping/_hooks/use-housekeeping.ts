"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { housekeepingService as api } from "../_services/housekeeping.service";
import type { IssueQuery, TaskQuery } from "../_types/housekeeping.types";

export const housekeepingKeys = {
  root: ["housekeeping"] as const,
  dashboard: (date?: string) => ["housekeeping", "dashboard", date] as const,
  tasks: (query?: TaskQuery) =>
    ["housekeeping", "tasks", "list", query] as const,
  assigned: (query?: TaskQuery) =>
    ["housekeeping", "tasks", "assigned", query] as const,
  task: (id: number) => ["housekeeping", "tasks", "detail", id] as const,
  issues: (query?: IssueQuery) =>
    ["housekeeping", "issues", "list", query] as const,
  issue: (id: number) => ["housekeeping", "issues", "detail", id] as const,
  productivity: (from?: string, to?: string) =>
    ["housekeeping", "productivity", { from, to }] as const,
};
export function useHousekeepingMutation<T>(
  mutationFn: (variables: T) => Promise<unknown>,
  successMessage: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    meta: { successMessage },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: housekeepingKeys.root }),
  });
}
export const useDashboard = (date: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: housekeepingKeys.dashboard(date),
    queryFn: () => api.dashboard(date),
    enabled,
  });
export const useTasks = (query: TaskQuery, enabled = true) =>
  useQuery({
    queryKey: housekeepingKeys.tasks(query),
    queryFn: () => api.tasks(query),
    enabled,
  });
export const useAssignedTasks = (query: TaskQuery, enabled = true) =>
  useQuery({
    queryKey: housekeepingKeys.assigned(query),
    queryFn: () => api.assigned(query),
    enabled,
  });
export const useTask = (id: number, enabled = true) =>
  useQuery({
    queryKey: housekeepingKeys.task(id),
    queryFn: () => api.task(id),
    enabled,
  });
export const useIssues = (query: IssueQuery, enabled = true) =>
  useQuery({
    queryKey: housekeepingKeys.issues(query),
    queryFn: () => api.issues(query),
    enabled,
  });
export const useIssue = (id: number, enabled = true) =>
  useQuery({
    queryKey: housekeepingKeys.issue(id),
    queryFn: () => api.issue(id),
    enabled,
  });
export const useProductivity = (
  from: string | undefined,
  to: string | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey: housekeepingKeys.productivity(from, to),
    queryFn: () => api.productivity(from, to),
    enabled,
  });
