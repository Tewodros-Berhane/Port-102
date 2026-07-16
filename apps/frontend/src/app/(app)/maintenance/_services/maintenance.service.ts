import { apiClient } from "@/lib/api-client";
import type {
  Asset,
  Dashboard,
  Page,
  Plan,
  Ticket,
  TicketQuery,
} from "../_types/maintenance.types";
export const maintenanceApi = {
  dashboard: () => apiClient.get<Dashboard>("proxy/maintenance/dashboard"),
  tickets: (q: TicketQuery) =>
    apiClient.get<Page<Ticket>>("proxy/maintenance/tickets", q),
  assigned: (q: TicketQuery) =>
    apiClient.get<Page<Ticket>>("proxy/maintenance/tickets/assigned/me", q),
  ticket: (id: number) =>
    apiClient.get<Ticket>(`proxy/maintenance/tickets/${id}`),
  createTicket: (body: unknown) =>
    apiClient.post<Ticket>("proxy/maintenance/tickets", body),
  updateTicket: (id: number, body: unknown) =>
    apiClient.patch<Ticket>(`proxy/maintenance/tickets/${id}`, body),
  start: (id: number, notes?: string, markRoomUnderMaintenance?: boolean) =>
    apiClient.patch<Ticket>(`proxy/maintenance/tickets/${id}/start`, {
      notes,
      markRoomUnderMaintenance,
    }),
  complete: (id: number, completionNotes?: string) =>
    apiClient.patch<Ticket>(`proxy/maintenance/tickets/${id}/complete`, {
      completionNotes,
    }),
  approve: (id: number, approvalNotes?: string, clearMaintenance?: boolean) =>
    apiClient.patch<Ticket>(`proxy/maintenance/tickets/${id}/approve`, {
      approvalNotes,
      clearMaintenance,
    }),
  reject: (id: number, rejectionReason: string) =>
    apiClient.patch<Ticket>(`proxy/maintenance/tickets/${id}/reject`, {
      rejectionReason,
    }),
  cancel: (id: number, reason: string) =>
    apiClient.patch<Ticket>(`proxy/maintenance/tickets/${id}/cancel`, {
      reason,
    }),
  note: (id: number, note: string) =>
    apiClient.post(`proxy/maintenance/tickets/${id}/notes`, { note }),
  photo: (id: number, url: string, description?: string) =>
    apiClient.post(`proxy/maintenance/tickets/${id}/photos`, {
      url,
      description,
    }),
  markOut: (roomId: number, reason?: string) =>
    apiClient.patch(`proxy/maintenance/rooms/${roomId}/mark-out-of-order`, {
      reason,
    }),
  markUnder: (roomId: number, reason?: string) =>
    apiClient.patch(
      `proxy/maintenance/rooms/${roomId}/mark-under-maintenance`,
      { reason },
    ),
  clearRoom: (roomId: number, reason?: string) =>
    apiClient.patch(`proxy/maintenance/rooms/${roomId}/clear-maintenance`, {
      reason,
    }),
  assets: (q: Record<string, string | number | undefined>) =>
    apiClient.get<Page<Asset>>("proxy/maintenance/assets", q),
  asset: (id: number) => apiClient.get<Asset>(`proxy/maintenance/assets/${id}`),
  createAsset: (body: unknown) =>
    apiClient.post<Asset>("proxy/maintenance/assets", body),
  updateAsset: (id: number, body: unknown) =>
    apiClient.patch<Asset>(`proxy/maintenance/assets/${id}`, body),
  deactivateAsset: (id: number) =>
    apiClient.delete<Asset>(`proxy/maintenance/assets/${id}`),
  plans: (q: Record<string, string | number | undefined>) =>
    apiClient.get<Page<Plan>>("proxy/maintenance/preventive-plans", q),
  plan: (id: number) =>
    apiClient.get<Plan>(`proxy/maintenance/preventive-plans/${id}`),
  createPlan: (body: unknown) =>
    apiClient.post<Plan>("proxy/maintenance/preventive-plans", body),
  updatePlan: (id: number, body: unknown) =>
    apiClient.patch<Plan>(`proxy/maintenance/preventive-plans/${id}`, body),
  deletePlan: (id: number) =>
    apiClient.delete<Plan>(`proxy/maintenance/preventive-plans/${id}`),
  generate: (id: number, body: unknown = {}) =>
    apiClient.post(
      `proxy/maintenance/preventive-plans/${id}/create-ticket`,
      body,
    ),
};
