import { Test, TestingModule } from '@nestjs/testing';
import {
  ReservationSource,
  ReservationStatus,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
  StayRoomAssignmentStatus,
  StayStatus,
} from '../../generated/prisma/client';
import { FrontDeskRepository } from './repositories/front-desk.repository';
import { FrontDeskService } from './front-desk.service';

describe('FrontDeskService', () => {
  let service: FrontDeskService;
  let frontDeskRepository: {
    getDashboardCounts: jest.Mock;
    listArrivals: jest.Mock;
    listDepartures: jest.Mock;
    listInHouse: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'frontdesk@demo-hotel.com',
    roleKey: 'FRONT_DESK_CASHIER',
    roleId: 4,
    departmentId: null,
    tokenVersion: 0,
  };
  const reservation = {
    id: 20,
    reservationNumber: 'RES-20260610-123450',
    guestId: 12,
    status: ReservationStatus.CONFIRMED,
    source: ReservationSource.PHONE,
    checkInDate: new Date('2026-06-10T00:00:00.000Z'),
    checkOutDate: new Date('2026-06-12T00:00:00.000Z'),
    adults: 2,
    children: 0,
    specialRequests: null,
    internalNotes: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    guest: {
      id: 12,
      firstName: 'Marta',
      lastName: 'Tesfaye',
      email: 'marta@example.com',
      phone: null,
      status: 'ACTIVE',
    },
    rooms: [],
  };
  const activeStay = {
    id: 40,
    stayNumber: 'STAY-20260610-123450',
    reservationId: 20,
    guestId: 12,
    status: StayStatus.ACTIVE,
    checkedInAt: new Date('2026-06-10T08:00:00.000Z'),
    expectedCheckOutDate: new Date('2026-06-12T00:00:00.000Z'),
    checkedOutAt: null,
    notes: null,
    createdAt: new Date('2026-06-10T08:00:00.000Z'),
    updatedAt: new Date('2026-06-10T08:00:00.000Z'),
    guest: reservation.guest,
    reservation: {
      id: 20,
      reservationNumber: 'RES-20260610-123450',
      status: ReservationStatus.CHECKED_IN,
      source: ReservationSource.PHONE,
      checkInDate: new Date('2026-06-10T00:00:00.000Z'),
      checkOutDate: new Date('2026-06-12T00:00:00.000Z'),
      adults: 2,
      children: 0,
    },
    roomAssignments: [
      {
        id: 50,
        stayId: 40,
        roomId: 9,
        reservationRoomId: 30,
        status: StayRoomAssignmentStatus.ACTIVE,
        assignedAt: new Date('2026-06-10T08:00:00.000Z'),
        room: {
          id: 9,
          roomNumber: '101',
          displayName: null,
          roomTypeId: 4,
          occupancyStatus: RoomOccupancyStatus.OCCUPIED,
          cleaningStatus: RoomCleaningStatus.CLEAN,
          maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
          isActive: true,
        },
        reservationRoom: {
          id: 30,
          reservationId: 20,
          roomTypeId: 4,
          roomId: 9,
          status: 'CHECKED_IN',
        },
      },
    ],
  };

  beforeEach(async () => {
    frontDeskRepository = {
      getDashboardCounts: jest.fn().mockResolvedValue({
        arrivalsToday: 3,
        departuresToday: 2,
        inHouseGuests: 8,
        activeStays: 8,
        vacantRooms: 12,
        occupiedRooms: 8,
        dirtyRooms: 4,
        outOfOrderRooms: 1,
        availablePhysicalRooms: 10,
      }),
      listArrivals: jest.fn().mockResolvedValue([1, [reservation]]),
      listDepartures: jest.fn().mockResolvedValue([1, [activeStay]]),
      listInHouse: jest.fn().mockResolvedValue([1, [activeStay]]),
    };
