import { apiClient } from "@/lib/api-client";
import type {
  AvailabilityResult,
  AvailabilityRoom,
  CreateReservationPayload,
  Reservation,
  ReservationGuestOption,
  ReservationList,
  ReservationQuery,
  ReservationRoomPayload,
} from "../_types/reservations.types";
export const getReservations = (query: ReservationQuery) =>
  apiClient.get<ReservationList>("proxy/reservations", query);
export const getReservation = (id: number) =>
  apiClient.get<Reservation>(`proxy/reservations/${id}`);
export const createReservation = (payload: CreateReservationPayload) =>
  apiClient.post<Reservation>("proxy/reservations", payload);
export const updateReservation = (
  id: number,
  payload: Partial<Omit<CreateReservationPayload, "rooms">>,
) => apiClient.patch<Reservation>(`proxy/reservations/${id}`, payload);
export const confirmReservation = (id: number) =>
  apiClient.patch<Reservation>(`proxy/reservations/${id}/confirm`);
export const cancelReservation = (id: number, cancellationReason: string) =>
  apiClient.patch<Reservation>(`proxy/reservations/${id}/cancel`, {
    cancellationReason,
  });
export const markNoShow = (id: number, reason?: string) =>
  apiClient.patch<Reservation>(`proxy/reservations/${id}/no-show`, { reason });
export const checkInReservation = (
  id: number,
  payload: {
    roomAssignments?: { reservationRoomId?: number | null; roomId: number }[];
    notes?: string | null;
  },
) => apiClient.post<unknown>(`proxy/reservations/${id}/check-in`, payload);
export const addReservationRoom = (
  id: number,
  payload: ReservationRoomPayload,
) => apiClient.post<Reservation>(`proxy/reservations/${id}/rooms`, payload);
export const updateReservationRoom = (
  id: number,
  lineId: number,
  payload: Partial<ReservationRoomPayload>,
) =>
  apiClient.patch<Reservation>(
    `proxy/reservations/${id}/rooms/${lineId}`,
    payload,
  );
export const removeReservationRoom = (id: number, lineId: number) =>
  apiClient.delete<Reservation>(`proxy/reservations/${id}/rooms/${lineId}`);
export const searchAvailability = (query: {
  checkInDate: string;
  checkOutDate: string;
  roomTypeId?: number;
  adults?: number;
  children?: number;
}) =>
  apiClient.get<AvailabilityResult>(
    "proxy/reservations/availability/search",
    query,
  );
export const searchReservationGuests = (search: string) =>
  apiClient.get<{ items: ReservationGuestOption[]; pagination: unknown }>(
    "proxy/guests",
    { page: 1, pageSize: 10, search, status: "ACTIVE" },
  );
export const listAvailableRooms = (query: {
  checkInDate: string;
  checkOutDate: string;
  roomTypeId?: number;
  adults?: number;
  children?: number;
}) =>
  apiClient.get<{
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    roomTypeId: number | null;
    rooms: AvailabilityRoom[];
  }>("proxy/reservations/availability/rooms", query);
