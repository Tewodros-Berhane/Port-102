import { apiClient } from "@/lib/api-client";
import type { AuditResponse } from "../_types/audit.types";
export const getAuditLogs = (query: {
  page: number;
  pageSize: number;
  action?: string;
  entityType?: string;
}) => apiClient.get<AuditResponse>("proxy/audit-logs", query);
