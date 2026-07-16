import type {
  Arrival,
  Pagination,
  ReservationRoom,
} from "../../front-desk/_types/front-desk.types";
export const reservationStatuses = [
  "DRAFT",
  "CONFIRMED",
  "CANCELLED",
  "NO_SHOW",
  "CHECKED_IN",
  "CHECKED_OUT",
] as const;
export const reservationSources = [
  "WALK_IN",
  "PHONE",
  "EMAIL",
  "WEBSITE",
  "OTA",
  "CORPORATE",
  "AGENT",
  "OTHER",
] as const;
export type ReservationStatus = (typeof reservationStatuses)[number];
export type ReservationSource = (typeof reservationSources)[number];
export type Reservation = Arrival & {
  status: ReservationStatus;
  source: ReservationSource;
  cancellationReason: string | null;
  cancelledAt: string | null;
  noShowAt: string | null;
  createdByUserId: number;
  cancelledByUserId: number | null;
  createdBy: { id: number; email: string; fullName: string };
  cancelledBy: { id: number; email: string; fullName: string } | null;
  rooms: ReservationRoom[];
};
export type ReservationList = { items: Reservation[]; pagination: Pagination };
export type ReservationQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReservationStatus;
  source?: ReservationSource;
  guestId?: number;
  checkInFrom?: string;
  checkInTo?: string;
  checkOutFrom?: string;
  checkOutTo?: string;
};
export type ReservationRoomPayload = {
  roomTypeId: number;
  roomId?: number | null;
  rate?: number | null;
  notes?: string | null;
};
export type CreateReservationPayload = {
  guestId: number;
  checkInDate: string;
  checkOutDate: string;
  adults?: number;
  children?: number;
  source?: ReservationSource;
  specialRequests?: string;
  internalNotes?: string;
  rooms: ReservationRoomPayload[];
};
export type AvailabilityRoom = {
  id: number;
  roomNumber: string;
  displayName: string | null;
  roomTypeId: number;
  occupancyStatus: string;
  cleaningStatus: string;
  maintenanceStatus: string;
  isActive: boolean;
};
export type AvailabilityResult = {
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  roomTypeId: number | null;
  roomTypes: {
    roomType: {
      id: number;
      name: string;
      code: string;
      baseOccupancy: number;
      maxOccupancy: number;
      baseRate: string;
      isActive: boolean;
    };
    totalRooms: number;
    reservedRooms: number;
    availableRooms: number;
    requestedOccupancy: number;
    fitsRequestedOccupancy: boolean;
    isAvailable: boolean;
  }[];
};
export type ReservationGuestOption = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE";
};
