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
      listReservations: jest.fn().mockResolvedValue([1, [reservation]]),
      findReservation: jest.fn().mockResolvedValue(reservation),
      listCalendarReservations: jest.fn().mockResolvedValue([reservation]),
      updateReservation: jest.fn().mockResolvedValue(reservation),
    };
    reservationRoomsRepository = {
      createReservationRoom: jest.fn().mockResolvedValue(reservation.rooms[0]),
      findReservationRoom: jest.fn().mockResolvedValue(reservation.rooms[0]),
      updateReservationRoom: jest.fn().mockResolvedValue(reservation.rooms[0]),
      updateRoomsForReservation: jest.fn().mockResolvedValue({ count: 1 }),
      removeReservationRoom: jest.fn().mockResolvedValue(reservation.rooms[0]),
      countActiveRooms: jest.fn().mockResolvedValue(2),
    };
    reservationAvailabilityRepository = {
      countPhysicalRooms: jest.fn().mockResolvedValue(5),
      countReservedRooms: jest.fn().mockResolvedValue(1),
      countOverlappingRoomReservations: jest.fn().mockResolvedValue(0),
      listRoomTypesForAvailability: jest
        .fn()
        .mockResolvedValue([availabilityRoomType]),
      listAvailableRooms: jest.fn().mockResolvedValue([room]),
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
          provide: ReservationRoomsRepository,
          useValue: reservationRoomsRepository,
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

  it('lists reservations with pagination and normalized filters', async () => {
    const result = await service.list(currentUser, {
      page: 2,
      limit: 10,
      search: ' Marta ',
      status: ReservationStatus.CONFIRMED,
      source: ReservationSource.PHONE,
      guestId: 12,
      checkInFrom: '2026-06-01',
      checkInTo: '2026-06-30',
    });

    expect(reservationsRepository.listReservations).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'Marta',
      status: ReservationStatus.CONFIRMED,
      source: ReservationSource.PHONE,
      guestId: 12,
      checkInFrom: new Date('2026-06-01T00:00:00.000Z'),
      checkInTo: new Date('2026-06-30T00:00:00.000Z'),
      checkOutFrom: undefined,
      checkOutTo: undefined,
    });
    expect(result).toMatchObject({
      items: [
        {
          id: 20,
          rooms: [
            {
              rate: '140',
            },
          ],
        },
      ],
      pagination: {
        page: 2,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('returns reservation details by id', async () => {
    const result = await service.getById(currentUser, 20);

    expect(reservationsRepository.findReservation).toHaveBeenCalledWith(20);
    expect(result).toMatchObject({
      id: 20,
      reservationNumber: 'RES-20260527-123450',
    });
  });

  it('throws when a reservation detail does not exist', async () => {
    reservationsRepository.findReservation.mockResolvedValue(null);

    await expect(service.getById(currentUser, 999)).rejects.toThrow(
      'Reservation was not found.',
    );
  });

  it('searches availability for fitting room types with remaining inventory', async () => {
    const result = await service.searchAvailability(currentUser, {
      checkInDate: '2026-06-10',
      checkOutDate: '2026-06-12',
      adults: 2,
      children: 1,
    });

    expect(
      reservationAvailabilityRepository.listRoomTypesForAvailability,
    ).toHaveBeenCalledWith({
      roomTypeId: undefined,
      minOccupancy: 3,
    });
    expect(result).toMatchObject({
      nights: 2,
      adults: 2,
      children: 1,
      roomTypes: [
        {
          totalRooms: 5,
          reservedRooms: 1,
          availableRooms: 4,
          requestedOccupancy: 3,
          fitsRequestedOccupancy: true,
          isAvailable: true,
          roomType: {
            id: 4,
            baseRate: '125.50',
          },
        },
      ],
    });
  });

  it('returns room type availability even when requested occupancy does not fit', async () => {
    const result = await service.getAvailabilityByRoomType(currentUser, {
      checkInDate: '2026-06-10',
      checkOutDate: '2026-06-12',
      adults: 4,
      children: 0,
      roomTypeId: 4,
    });

    expect(
      reservationAvailabilityRepository.listRoomTypesForAvailability,
    ).toHaveBeenCalledWith({
      roomTypeId: 4,
    });
    expect(result).toMatchObject({
      roomTypeId: 4,
      roomTypes: [
        {
          availableRooms: 0,
          fitsRequestedOccupancy: false,
        },
      ],
    });
  });

  it('lists available specific rooms for a date range', async () => {
    const result = await service.listAvailableRooms(currentUser, {
      checkInDate: '2026-06-10',
      checkOutDate: '2026-06-12',
      roomTypeId: 4,
    });

    expect(roomTypesRepository.findRoomType).toHaveBeenCalledWith(4);
    expect(
      reservationAvailabilityRepository.listAvailableRooms,
    ).toHaveBeenCalledWith({
      roomTypeId: 4,
      checkInDate: new Date('2026-06-10T00:00:00.000Z'),
      checkOutDate: new Date('2026-06-12T00:00:00.000Z'),
    });
    expect(result).toMatchObject({
      nights: 2,
      roomTypeId: 4,
      rooms: [
        {
          id: 9,
          roomType: {
            baseRate: '125.50',
          },
        },
      ],
    });
  });

  it('returns booking calendar reservations for overlapping stays', async () => {
    const result = await service.getBookingCalendar(currentUser, {
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      roomTypeId: 4,
      status: ReservationStatus.CONFIRMED,
    });

    expect(
      reservationsRepository.listCalendarReservations,
    ).toHaveBeenCalledWith({
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      endDate: new Date('2026-06-30T00:00:00.000Z'),
      roomId: undefined,
      roomTypeId: 4,
      status: ReservationStatus.CONFIRMED,
    });
    expect(result).toMatchObject({
      roomTypeId: 4,
      status: ReservationStatus.CONFIRMED,
      items: [
        {
          id: 20,
          rooms: [
            {
              rate: '140',
              roomType: {
                baseRate: '125.50',
              },
            },
          ],
        },
      ],
    });
  });

  it('updates editable reservations and rechecks availability when dates change', async () => {
    const updatedReservation = {
      ...reservation,
      checkInDate: new Date('2026-06-11T00:00:00.000Z'),
      checkOutDate: new Date('2026-06-13T00:00:00.000Z'),
      internalNotes: 'Updated note',
    };
    reservationsRepository.updateReservation.mockResolvedValue(
      updatedReservation,
    );

    const result = await service.update(currentUser, 20, {
      checkInDate: '2026-06-11',
      checkOutDate: '2026-06-13',
      internalNotes: ' Updated note ',
    });

    expect(
      reservationAvailabilityRepository.countOverlappingRoomReservations,
    ).toHaveBeenCalledWith({
      roomId: 9,
      checkInDate: new Date('2026-06-11T00:00:00.000Z'),
      checkOutDate: new Date('2026-06-13T00:00:00.000Z'),
      excludeReservationId: 20,
    });
    expect(reservationsRepository.updateReservation).toHaveBeenCalledWith(20, {
      checkInDate: new Date('2026-06-11T00:00:00.000Z'),
      checkOutDate: new Date('2026-06-13T00:00:00.000Z'),
      internalNotes: 'Updated note',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'reservations.updated',
        entityId: '20',
      }),
    );
    expect(result).toMatchObject({
      checkInDate: updatedReservation.checkInDate,
      checkOutDate: updatedReservation.checkOutDate,
      internalNotes: 'Updated note',
    });
  });

  it('blocks updates to terminal reservations', async () => {
    reservationsRepository.findReservation.mockResolvedValue({
      ...reservation,
      status: ReservationStatus.CANCELLED,
    });

    await expect(
      service.update(currentUser, 20, {
        internalNotes: 'Late note',
      }),
    ).rejects.toThrow('Reservation cannot be modified in its current status.');

    expect(reservationsRepository.updateReservation).not.toHaveBeenCalled();
  });

  it('confirms draft reservations and leaves already confirmed reservations unchanged', async () => {
    reservationsRepository.findReservation.mockResolvedValueOnce({
      ...reservation,
      status: ReservationStatus.DRAFT,
    });
    reservationsRepository.updateReservation.mockResolvedValueOnce(reservation);

    const result = await service.confirm(currentUser, 20);

    expect(reservationsRepository.updateReservation).toHaveBeenCalledWith(20, {
      status: ReservationStatus.CONFIRMED,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'reservations.confirmed',
      }),
    );
    expect(result).toMatchObject({
      status: ReservationStatus.CONFIRMED,
    });

    jest.clearAllMocks();
    reservationsRepository.findReservation.mockResolvedValueOnce(reservation);

    await service.confirm(currentUser, 20);

    expect(reservationsRepository.updateReservation).not.toHaveBeenCalled();
  });

  it('cancels reservations in a transaction and releases reservation rooms', async () => {
    reservationsRepository.updateReservation.mockResolvedValue({
      ...reservation,
      status: ReservationStatus.CANCELLED,
      cancellationReason: 'Guest changed plans',
      cancelledAt: new Date('2026-06-01T00:00:00.000Z'),
      cancelledByUserId: 1,
      rooms: reservation.rooms.map((room) => ({
        ...room,
        status: ReservationRoomStatus.CANCELLED,
      })),
    });

    await service.cancel(currentUser, 20, {
      cancellationReason: ' Guest changed plans ',
    });

    expect(reservationsRepository.runInTransaction).toHaveBeenCalled();
    expect(
      reservationRoomsRepository.updateRoomsForReservation,
    ).toHaveBeenCalledWith(
      20,
      {
        status: ReservationRoomStatus.CANCELLED,
      },
      {},
    );
    expect(reservationsRepository.updateReservation).toHaveBeenCalledWith(
      20,
      expect.objectContaining({
        status: ReservationStatus.CANCELLED,
        cancellationReason: 'Guest changed plans',
        cancelledByUserId: 1,
        cancelledAt: expect.any(Date),
      }),
      {},
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'reservations.cancelled',
      }),
    );
  });

  it('rejects cancellation for checked-out reservations', async () => {
    reservationsRepository.findReservation.mockResolvedValue({
      ...reservation,
      status: ReservationStatus.CHECKED_OUT,
    });

    await expect(
      service.cancel(currentUser, 20, {
        cancellationReason: 'Too late to cancel',
      }),
    ).rejects.toThrow('Reservation cannot be cancelled in its current status.');

    expect(
      reservationRoomsRepository.updateRoomsForReservation,
    ).not.toHaveBeenCalled();
    expect(reservationsRepository.updateReservation).not.toHaveBeenCalled();
  });

  it('marks confirmed reservations no-show and releases reservation rooms', async () => {
    reservationsRepository.updateReservation.mockResolvedValue({
      ...reservation,
      status: ReservationStatus.NO_SHOW,
      noShowAt: new Date('2026-06-01T01:00:00.000Z'),
      rooms: reservation.rooms.map((room) => ({
        ...room,
        status: ReservationRoomStatus.CANCELLED,
      })),
    });

    await service.markNoShow(currentUser, 20, {
      reason: 'Guest did not arrive',
    });

    expect(
      reservationRoomsRepository.updateRoomsForReservation,
    ).toHaveBeenCalledWith(
      20,
      {
        status: ReservationRoomStatus.CANCELLED,
      },
      {},
    );
    expect(reservationsRepository.updateReservation).toHaveBeenCalledWith(
      20,
      expect.objectContaining({
        status: ReservationStatus.NO_SHOW,
        noShowAt: expect.any(Date),
      }),
      {},
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'reservations.no_show_marked',
      }),
    );
  });

  it('rejects no-show marking for non-confirmed reservations', async () => {
    reservationsRepository.findReservation.mockResolvedValue({
      ...reservation,
      status: ReservationStatus.DRAFT,
    });

    await expect(
      service.markNoShow(currentUser, 20, {
        reason: 'Not ready',
      }),
    ).rejects.toThrow('Only confirmed reservations can be marked no-show.');

    expect(
      reservationRoomsRepository.updateRoomsForReservation,
    ).not.toHaveBeenCalled();
    expect(reservationsRepository.updateReservation).not.toHaveBeenCalled();
  });

  it('adds rooms to editable reservations after checking the full room set', async () => {
    await service.addRoom(currentUser, 20, {
      roomTypeId: 4,
      rate: 150,
      notes: ' Extra room ',
    });

    expect(
      reservationAvailabilityRepository.countReservedRooms,
    ).toHaveBeenCalledWith({
      roomTypeId: 4,
      checkInDate: new Date('2026-06-10T00:00:00.000Z'),
      checkOutDate: new Date('2026-06-12T00:00:00.000Z'),
      excludeReservationId: 20,
    });
    expect(
      reservationRoomsRepository.createReservationRoom,
    ).toHaveBeenCalledWith({
      reservationId: 20,
      roomTypeId: 4,
      roomId: null,
      rate: '150',
      notes: 'Extra room',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'reservations.room_added',
      }),
    );
  });

  it('updates reservation room assignments after availability checks', async () => {
    await service.updateRoom(currentUser, 20, 30, {
      roomId: null,
      rate: 145,
      notes: ' Cleared exact assignment ',
    });

    expect(reservationRoomsRepository.findReservationRoom).toHaveBeenCalledWith(
      30,
    );
    expect(
      reservationRoomsRepository.updateReservationRoom,
    ).toHaveBeenCalledWith(30, {
      roomId: null,
      rate: '145',
      notes: 'Cleared exact assignment',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'reservations.room_updated',
      }),
    );
  });

  it('rejects reservation room updates for rooms outside the reservation', async () => {
    reservationRoomsRepository.findReservationRoom.mockResolvedValue({
      ...reservation.rooms[0],
      reservationId: 999,
    });

    await expect(
      service.updateRoom(currentUser, 20, 30, {
        roomId: null,
      }),
    ).rejects.toThrow('Reservation room was not found.');

    expect(
      reservationRoomsRepository.updateReservationRoom,
    ).not.toHaveBeenCalled();
  });

  it('rejects updates to cancelled reservation rooms', async () => {
    reservationRoomsRepository.findReservationRoom.mockResolvedValue({
      ...reservation.rooms[0],
      status: ReservationRoomStatus.CANCELLED,
    });

    await expect(
      service.updateRoom(currentUser, 20, 30, {
        roomId: null,
      }),
    ).rejects.toThrow('Cancelled reservation rooms cannot be updated.');

    expect(
      reservationRoomsRepository.updateReservationRoom,
    ).not.toHaveBeenCalled();
  });

  it('blocks removing the last active room from an active reservation', async () => {
    reservationRoomsRepository.countActiveRooms.mockResolvedValue(1);

    await expect(service.removeRoom(currentUser, 20, 30)).rejects.toThrow(
      'Cannot remove the last active room from a reservation.',
    );

    expect(
      reservationRoomsRepository.removeReservationRoom,
    ).not.toHaveBeenCalled();
  });

  it('removes reservation rooms and records audit metadata', async () => {
    await service.removeRoom(currentUser, 20, 30);

    expect(
      reservationRoomsRepository.removeReservationRoom,
    ).toHaveBeenCalledWith(30);
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'reservations.room_removed',
      }),
    );
  });
});
