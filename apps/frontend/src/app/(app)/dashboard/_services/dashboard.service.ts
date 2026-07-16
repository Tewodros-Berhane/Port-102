import { apiClient } from "@/lib/api-client";
import type {
  DashboardFilters,
  DashboardReport,
  DailySummary,
  ExceptionReport,
} from "../_types/dashboard.types";
export const getDashboard = (filters: DashboardFilters) =>
  apiClient.get<DashboardReport>("proxy/reports/dashboard", filters);
export const getDailySummary = (filters: DashboardFilters) =>
  apiClient.get<DailySummary>("proxy/reports/daily-summary", filters);
export const getExceptions = () =>
  apiClient.get<ExceptionReport>("proxy/reports/exceptions");
