import { Test, TestingModule } from '@nestjs/testing';

import {
  GuestStatus,
  ReservationRoomStatus,
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
import { ReservationRoomsRepository } from './repositories/reservation-rooms.repository';
import { ReservationsRepository } from './repositories/reservations.repository';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let reservationsRepository: {
    runInTransaction: jest.Mock;
    createReservation: jest.Mock;
    findByReservationNumber: jest.Mock;
    listReservations: jest.Mock;
    findReservation: jest.Mock;
    listCalendarReservations: jest.Mock;
    updateReservation: jest.Mock;
  };
  let reservationRoomsRepository: {
    createReservationRoom: jest.Mock;
    findReservationRoom: jest.Mock;
    updateReservationRoom: jest.Mock;
    updateRoomsForReservation: jest.Mock;
    removeReservationRoom: jest.Mock;
    countActiveRooms: jest.Mock;
  };
  let reservationAvailabilityRepository: {
    countPhysicalRooms: jest.Mock;
    countReservedRooms: jest.Mock;
    countOverlappingRoomReservations: jest.Mock;
    listRoomTypesForAvailability: jest.Mock;
    listAvailableRooms: jest.Mock;
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
  const availabilityRoomType = {
    id: 4,
    name: 'Deluxe King',
    code: 'DLX-KING',
    baseOccupancy: 2,
    maxOccupancy: 3,
    baseRate: { toString: () => '125.50' },
    isActive: true,
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a reservation in a transaction and records audit metadata', async () => {
    const result = await service.create(currentUser, {
      guestId: 12,
      checkInDate: '2026-06-10',
      checkOutDate: '2026-06-12',
      adults: 2,
      children: 1,
      source: ReservationSource.PHONE,
      specialRequests: ' Quiet room ',
      internalNotes: ' VIP guest ',
      rooms: [
        {
          roomTypeId: 4,
          roomId: 9,
          rate: 140,
          notes: ' Near elevator ',
        },
      ],
    });

    expect(result).toMatchObject({
      id: 20,
      reservationNumber: 'RES-20260527-123450',
      rooms: [
        {
          rate: '140',
          roomType: {
            baseRate: '125.50',
          },
        },
      ],
    });
    expect(guestsRepository.findGuestProfile).toHaveBeenCalledWith(12);
    expect(roomTypesRepository.findRoomType).toHaveBeenCalledWith(4);
    expect(roomsRepository.findRoom).toHaveBeenCalledWith(9);
    expect(
      reservationAvailabilityRepository.countOverlappingRoomReservations,
    ).toHaveBeenCalledWith({
      roomId: 9,
      checkInDate: new Date('2026-06-10T00:00:00.000Z'),
      checkOutDate: new Date('2026-06-12T00:00:00.000Z'),
    });
    expect(reservationsRepository.runInTransaction).toHaveBeenCalled();
    expect(reservationsRepository.createReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        guest: {
          connect: {
            id: 12,
          },
        },
        source: ReservationSource.PHONE,
        adults: 2,
        children: 1,
        specialRequests: 'Quiet room',
        internalNotes: 'VIP guest',
        rooms: {
          create: [
            {
              roomType: {
                connect: {
                  id: 4,
                },
              },
              room: {
                connect: {
                  id: 9,
                },
              },
              rate: '140',
              notes: 'Near elevator',
            },
          ],
        },
      }),
      {},
    );
    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'reservations.created',
      entityType: 'Reservation',
      entityId: '20',
      metadata: {
        reservationNumber: 'RES-20260527-123450',
        guestId: 12,
        checkInDate: '2026-06-10T00:00:00.000Z',
        checkOutDate: '2026-06-12T00:00:00.000Z',
        roomCount: 1,
      },
    });
  });

  it('rejects invalid date ranges', async () => {
    await expect(
      service.create(currentUser, {
        guestId: 12,
        checkInDate: '2026-06-12',
        checkOutDate: '2026-06-10',
        rooms: [
          {
            roomTypeId: 4,
          },
        ],
      }),
    ).rejects.toThrow('Check-out date must be after check-in date.');

    expect(guestsRepository.findGuestProfile).not.toHaveBeenCalled();
  });

  it('rejects inactive guests', async () => {
    guestsRepository.findGuestProfile.mockResolvedValue({
      ...guest,
      status: GuestStatus.INACTIVE,
    });

    await expect(
      service.create(currentUser, {
        guestId: 12,
        checkInDate: '2026-06-10',
        checkOutDate: '2026-06-12',
        rooms: [
          {
            roomTypeId: 4,
          },
        ],
      }),
    ).rejects.toThrow('Cannot create reservation for inactive guest.');
  });

  it('rejects inactive room types', async () => {
    roomTypesRepository.findRoomType.mockResolvedValue({
      ...roomType,
      isActive: false,
    });

    await expect(
      service.create(currentUser, {
        guestId: 12,
        checkInDate: '2026-06-10',
        checkOutDate: '2026-06-12',
        rooms: [
          {
            roomTypeId: 4,
          },
        ],
      }),
    ).rejects.toThrow('Cannot reserve an inactive room type.');
  });

  it('rejects selected room type mismatches', async () => {
    roomsRepository.findRoom.mockResolvedValue({
      ...room,
      roomTypeId: 5,
    });

    await expect(
      service.create(currentUser, {
        guestId: 12,
        checkInDate: '2026-06-10',
        checkOutDate: '2026-06-12',
        rooms: [
          {
            roomTypeId: 4,
            roomId: 9,
          },
        ],
      }),
    ).rejects.toThrow(
      'Selected room does not belong to the requested room type.',
    );
  });

  it('rejects overlapping selected room reservations', async () => {
    reservationAvailabilityRepository.countOverlappingRoomReservations.mockResolvedValue(
      1,
    );

    await expect(
      service.create(currentUser, {
        guestId: 12,
        checkInDate: '2026-06-10',
        checkOutDate: '2026-06-12',
        rooms: [
          {
            roomTypeId: 4,
            roomId: 9,
          },
        ],
      }),
    ).rejects.toThrow(
      'Selected room is already reserved for the requested dates.',
    );
  });

  it('rejects room type reservations when there is no remaining capacity', async () => {
    reservationAvailabilityRepository.countPhysicalRooms.mockResolvedValue(2);
    reservationAvailabilityRepository.countReservedRooms.mockResolvedValue(2);

    await expect(
      service.create(currentUser, {
        guestId: 12,
        checkInDate: '2026-06-10',
        checkOutDate: '2026-06-12',
        rooms: [
          {
            roomTypeId: 4,
          },
        ],
      }),
    ).rejects.toThrow(
      'Not enough rooms are available for the requested dates.',
    );
  });
});