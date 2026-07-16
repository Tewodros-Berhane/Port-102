import { apiClient } from "@/lib/api-client";
import type { ReportFilters, ReportPayload } from "../_types/reports.types";
export const getReport = (endpoint: string, filters: ReportFilters) =>
  apiClient.get<ReportPayload>(`proxy/reports/${endpoint}`, filters);
