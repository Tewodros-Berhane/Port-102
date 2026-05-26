import { Test, TestingModule } from '@nestjs/testing';

import {
  GuestStatus,
  ReservationSource,
  ReservationStatus,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GuestsRepository } from '../guests/repositories/guests.repository';
import { RoomTypesRepository } from '../room-types/repositories/room-types.repository';
import { RoomsRepository } from '../rooms/repositories/rooms.repository';
import { ReservationAvailabilityRepository } from './repositories/reservation-availability.repository';
import { ReservationsRepository } from './repositories/reservations.repository';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let reservationsRepository: {
    runInTransaction: jest.Mock;
    createReservation: jest.Mock;
    findByReservationNumber: jest.Mock;
  };
  let reservationAvailabilityRepository: {
    countPhysicalRooms: jest.Mock;
    countReservedRooms: jest.Mock;
    countOverlappingRoomReservations: jest.Mock;
  };
  let guestsRepository: {
    findGuestProfile: jest.Mock;
  };
  let roomTypesRepository: {
    findRoomType: jest.Mock;
  };
  let roomsRepository: {
    findRoom: jest.Mock;
  };
  let auditLogsService: {
    record: jest.Mock;
  };

  const now = new Date('2026-05-27T00:00:00.000Z');
  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: null,
    tokenVersion: 0,
  };
  const guest = {
    id: 12,
    firstName: 'Marta',
    lastName: 'Tesfaye',
    email: 'marta@example.com',
    phone: '+251911000000',
    status: GuestStatus.ACTIVE,
  };
  const roomType = {
    id: 4,
    name: 'Deluxe King',
    code: 'DLX-KING',
    description: 'Large king room.',
    baseOccupancy: 2,
    maxOccupancy: 3,
    baseRate: { toString: () => '125.50' },
    isActive: true,
    createdAt: now,
    updatedAt: now,
    amenities: [],
  };
  const room = {
    id: 9,
    roomNumber: '101',
    displayName: 'Deluxe 101',
    floorId: 2,
    roomTypeId: 4,
    occupancyStatus: RoomOccupancyStatus.VACANT,
    cleaningStatus: RoomCleaningStatus.CLEAN,
    maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
    notes: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    floor: {
      id: 2,
      number: 1,
      name: 'First Floor',
      isActive: true,
    },
    roomType: {
      id: 4,
      name: 'Deluxe King',
      code: 'DLX-KING',
      baseOccupancy: 2,
      maxOccupancy: 3,
      baseRate: { toString: () => '125.50' },
      isActive: true,
    },
  };
  const reservation = {
    id: 20,
    reservationNumber: 'RES-20260527-123450',
    guestId: 12,
    status: ReservationStatus.CONFIRMED,
    source: ReservationSource.PHONE,
    checkInDate: new Date('2026-06-10T00:00:00.000Z'),
    checkOutDate: new Date('2026-06-12T00:00:00.000Z'),
    adults: 2,
    children: 1,
    specialRequests: 'Quiet room',
    internalNotes: 'VIP guest',
    cancellationReason: null,
    cancelledAt: null,
    noShowAt: null,
    createdByUserId: 1,
    cancelledByUserId: null,
    createdAt: now,
    updatedAt: now,
    guest,
    createdBy: {
      id: 1,
      email: 'admin@demo-hotel.com',
      fullName: 'Hotel Admin',
    },
    cancelledBy: null,
    rooms: [
      {
        id: 30,
        reservationId: 20,
        roomTypeId: 4,
        roomId: 9,
        status: 'RESERVED',
        rate: { toString: () => '140' },
        notes: 'Near elevator',
        createdAt: now,
        updatedAt: now,
        roomType: {
          id: 4,
          name: 'Deluxe King',
          code: 'DLX-KING',
          baseOccupancy: 2,
          maxOccupancy: 3,
          baseRate: { toString: () => '125.50' },
          isActive: true,
        },
        room: {
          id: 9,
          roomNumber: '101',
          displayName: 'Deluxe 101',
          roomTypeId: 4,
          maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
          isActive: true,
        },
      },
    ],
  };

  beforeEach(async () => {
    reservationsRepository = {
      runInTransaction: jest.fn(async (operation) => operation({})),
      createReservation: jest.fn().mockResolvedValue(reservation),
      findByReservationNumber: jest.fn().mockResolvedValue(null),
    };
    reservationAvailabilityRepository = {
      countPhysicalRooms: jest.fn().mockResolvedValue(5),
      countReservedRooms: jest.fn().mockResolvedValue(1),
      countOverlappingRoomReservations: jest.fn().mockResolvedValue(0),
    };
    guestsRepository = {
      findGuestProfile: jest.fn().mockResolvedValue(guest),
    };
    roomTypesRepository = {
      findRoomType: jest.fn().mockResolvedValue(roomType),
    };
    roomsRepository = {
      findRoom: jest.fn().mockResolvedValue(room),
    };
    auditLogsService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: ReservationsRepository,
          useValue: reservationsRepository,
        },
        {
          provide: ReservationAvailabilityRepository,
          useValue: reservationAvailabilityRepository,
        },
        {
          provide: GuestsRepository,
          useValue: guestsRepository,
        },
        {
          provide: RoomTypesRepository,
          useValue: roomTypesRepository,
        },
        {
          provide: RoomsRepository,
          useValue: roomsRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

