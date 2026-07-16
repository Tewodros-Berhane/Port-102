"use client";
import { useQuery } from "@tanstack/react-query";
import {
  getDashboard,
  getDailySummary,
  getExceptions,
} from "../_services/dashboard.service";
import type { DashboardFilters } from "../_types/dashboard.types";
export function useDashboard(filters: DashboardFilters, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "dashboard", filters],
    queryFn: () => getDashboard(filters),
    enabled,
  });
}
export function useDailySummary(filters: DashboardFilters, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "daily-summary", filters],
    queryFn: () => getDailySummary(filters),
    enabled,
  });
}
export function useExceptions(enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "exceptions"],
    queryFn: getExceptions,
    enabled,
  });
}
