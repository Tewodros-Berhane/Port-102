export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
export type GuestSummary = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: string;
};
export type RoomSummary = {
  id: number;
  roomNumber: string;
  displayName: string | null;
  roomTypeId: number;
  occupancyStatus: string;
  cleaningStatus: string;
  maintenanceStatus: string;
  isActive: boolean;
};
export type ReservationRoom = {
  id: number;
  roomTypeId: number;
  roomId: number | null;
  status: string;
  rate: string | number | null;
  notes: string | null;
  roomType: {
    id: number;
    name: string;
    code: string;
    baseOccupancy: number;
    maxOccupancy: number;
    baseRate: string | number;
  };
  room: RoomSummary | null;
};
export type Arrival = {
  id: number;
  reservationNumber: string;
  guestId: number;
  status: string;
  source: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  specialRequests: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  guest: GuestSummary;
  rooms: ReservationRoom[];
};
export type StayQueueItem = {
  id: number;
  stayNumber: string;
  reservationId: number;
  guestId: number;
  status: string;
  checkedInAt: string;
  expectedCheckOutDate: string;
  checkedOutAt: string | null;
  notes: string | null;
  guest: GuestSummary;
  reservation: {
    id: number;
    reservationNumber: string;
    status: string;
    source: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children: number;
  };
  currentRooms: {
    assignmentId: number;
    roomId: number;
    reservationRoomId: number | null;
    assignedAt: string;
    room: RoomSummary;
    reservationRoom: {
      id: number;
      reservationId: number;
      roomTypeId: number;
      roomId: number | null;
      status: string;
    } | null;
  }[];
};
export type FrontDeskDashboard = {
  date: string;
  arrivalsToday: number;
  departuresToday: number;
  inHouseGuests: number;
  activeStays: number;
  vacantRooms: number;
  occupiedRooms: number;
  dirtyRooms: number;
  outOfOrderRooms: number;
  availablePhysicalRooms: number;
};
export type QueueResponse<T> = {
  date?: string;
  items: T[];
  pagination: Pagination;
};
export type FrontDeskFilters = {
  date?: string;
  page?: number;
  limit?: number;
  search?: string;
};
