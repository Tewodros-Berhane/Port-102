export type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "TASK"
  | "APPROVAL"
  | "OPERATIONAL_ALERT";
export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";
export type NotificationRow = {
  id: number;
  userId: number;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  metadata: unknown;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type NotificationsResponse = NotificationRow[];
