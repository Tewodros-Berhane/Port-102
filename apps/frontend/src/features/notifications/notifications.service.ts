import { apiClient } from "@/lib/api-client";
export const getUnreadCount = () => apiClient.get<{ count: number }>("proxy/notifications/unread-count");
