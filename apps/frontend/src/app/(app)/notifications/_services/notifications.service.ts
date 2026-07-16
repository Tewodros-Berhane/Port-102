import { apiClient } from "@/lib/api-client";
import type {
  NotificationRow,
  NotificationsResponse,
  NotificationStatus,
  NotificationType,
} from "../_types/notifications.types";
export const getNotifications = (query: {
  page: number;
  limit: number;
  status?: NotificationStatus;
  type?: NotificationType;
}) => apiClient.get<NotificationsResponse>("proxy/notifications", query);
export const markRead = (id: number) =>
  apiClient.patch<NotificationRow>(`proxy/notifications/${id}/read`);
export const markAllRead = () =>
  apiClient.patch<{ count: number }>("proxy/notifications/read-all");
export const archiveNotification = (id: number) =>
  apiClient.patch<NotificationRow>(`proxy/notifications/${id}/archive`);
export const deleteNotification = (id: number) =>
  apiClient.delete<{ deleted: boolean }>(`proxy/notifications/${id}`);
