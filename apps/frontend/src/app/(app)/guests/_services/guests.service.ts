import { apiClient } from "@/lib/api-client";
import type { Guest, GuestList, GuestPayload } from "../_types/guests.types";
export const getGuests = (query: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE";
}) => apiClient.get<GuestList>("proxy/guests", query);
export const getGuest = (id: number) =>
  apiClient.get<Guest>(`proxy/guests/${id}`);
export const createGuest = (payload: GuestPayload) =>
  apiClient.post<Guest>("proxy/guests", payload);
export const updateGuest = (id: number, payload: Partial<GuestPayload>) =>
  apiClient.patch<Guest>(`proxy/guests/${id}`, payload);
