export type AuditRow = {
  id: number;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
  actor: { user: { id: number; email: string; fullName: string } } | null;
};
export type AuditResponse = {
  items: AuditRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
