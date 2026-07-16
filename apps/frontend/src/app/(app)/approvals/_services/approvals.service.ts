import { apiClient } from "@/lib/api-client";
import type {
  ApprovalRow,
  ApprovalsResponse,
  ApprovalStatus,
} from "../_types/approvals.types";
export const getApprovals = (query: {
  page: number;
  pageSize: number;
  status?: ApprovalStatus;
}) => apiClient.get<ApprovalsResponse>("proxy/approval-requests", query);
export const decideApproval = (
  id: number,
  decision: "approve" | "reject",
  decisionNote?: string,
) =>
  apiClient.patch<ApprovalRow>(`proxy/approval-requests/${id}/${decision}`, {
    decisionNote,
  });
