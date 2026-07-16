export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type ApprovalType =
  | "LARGE_DISCOUNT"
  | "REFUND"
  | "INVENTORY_ADJUSTMENT"
  | "PURCHASE_REQUEST"
  | "PURCHASE_ORDER"
  | "ROOM_OUT_OF_ORDER";
export type ApprovalRow = {
  id: number;
  type: ApprovalType;
  status: ApprovalStatus;
  title: string;
  reason: string;
  payload: unknown;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requestedBy: { user: { id: number; email: string; fullName: string } };
  decidedBy: { user: { id: number; email: string; fullName: string } } | null;
};
export type ApprovalsResponse = {
  items: ApprovalRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
