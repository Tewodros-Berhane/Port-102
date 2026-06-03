import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  FolioStatus,
  GuestStatus,
  HousekeepingPriority,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  Prisma,
  ReservationRoomStatus,
  ReservationSource,
  ReservationStatus,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
  StayRoomAssignmentStatus,
  StayStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FoliosRepository } from '../folios/repositories/folios.repository';
import { HousekeepingService } from '../housekeeping/housekeeping.service';
import { ReservationAvailabilityRepository } from '../reservations/repositories/reservation-availability.repository';
import { ReservationRoomsRepository } from '../reservations/repositories/reservation-rooms.repository';
import { ReservationsRepository } from '../reservations/repositories/reservations.repository';
import { RoomsRepository } from '../rooms/repositories/rooms.repository';
import { StayRoomAssignmentsRepository } from './repositories/stay-room-assignments.repository';
import { StaysRepository } from './repositories/stays.repository';
import { StaysService } from './stays.service';

describe('StaysService', () => {
  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
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
    cancellationReason: null,
    cancelledAt: null,
    noShowAt: null,
    createdByUserId: 1,
    cancelledByUserId: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    guest: {
      id: 12,
      firstName: 'Marta',
      lastName: 'Tesfaye',
      email: 'marta@example.com',
      phone: null,
      status: GuestStatus.ACTIVE,
    },
    createdBy: null,
    cancelledBy: null,
    rooms: [
      {
        id: 30,
        reservationId: 20,
        roomTypeId: 4,
        roomId: 9,
        status: ReservationRoomStatus.RESERVED,
        rate: null,
        notes: null,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        roomType: {
          id: 4,
          name: 'Deluxe King',
          code: 'DLX',
          baseOccupancy: 1,
          maxOccupancy: 2,
          baseRate: null,
          isActive: true,
        },
        room: {
          id: 9,
          roomNumber: '101',
          displayName: null,
          roomTypeId: 4,
          maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
          isActive: true,
        },
      },
    ],
  };
  const room = {
    id: 9,
    roomNumber: '101',
    displayName: null,
    floorId: 1,
    roomTypeId: 4,
    occupancyStatus: RoomOccupancyStatus.VACANT,
    cleaningStatus: RoomCleaningStatus.CLEAN,
    maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
    notes: null,
    isActive: true,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    floor: {
      id: 1,
      number: 1,
      name: 'First Floor',
      isActive: true,
    },
    roomType: {
      id: 4,
      name: 'Deluxe King',
      code: 'DLX',
      baseOccupancy: 1,
      maxOccupancy: 2,
      baseRate: null,
      isActive: true,
    },
  };
  const occupiedRoom = {
    ...room,
    occupancyStatus: RoomOccupancyStatus.OCCUPIED,
    cleaningStatus: RoomCleaningStatus.CLEAN,
  };
  const destinationRoom = {
    ...room,
    id: 10,
    roomNumber: '102',
    occupancyStatus: RoomOccupancyStatus.VACANT,
    cleaningStatus: RoomCleaningStatus.INSPECTED,
  };
  const secondReservationRoom = {
    ...reservation.rooms[0],
    id: 31,
    roomId: null,
    status: ReservationRoomStatus.RESERVED,
  };
  const checkedInStay = {
    id: 40,
    stayNumber: 'STAY-20260610-123450',
    reservationId: 20,
    guestId: 12,
    status: StayStatus.ACTIVE,
    checkedInAt: new Date('2026-06-10T08:00:00.000Z'),
    expectedCheckOutDate: new Date('2026-06-12T00:00:00.000Z'),
    checkedOutAt: null,
    checkedInByUserId: 1,
    checkedOutByUserId: null,
    notes: 'Guest arrived.',
    createdAt: new Date('2026-06-10T08:00:00.000Z'),
    updatedAt: new Date('2026-06-10T08:00:00.000Z'),
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
    guest: reservation.guest,
    checkedInBy: {
      id: 1,
      email: 'admin@demo-hotel.com',
      fullName: 'Admin User',
    },
    checkedOutBy: null,
    roomAssignments: [
      {
        id: 50,
        stayId: 40,
        roomId: 9,
        reservationRoomId: 30,
        status: StayRoomAssignmentStatus.ACTIVE,
        assignedAt: new Date('2026-06-10T08:00:00.000Z'),
        releasedAt: null,
        assignedByUserId: 1,
        releasedByUserId: null,
        reason: 'Guest arrived.',
        room: occupiedRoom,
        reservationRoom: {
          id: 30,
          reservationId: 20,
          roomTypeId: 4,
          roomId: 9,
          status: ReservationRoomStatus.CHECKED_IN,
        },
      },
    ],
  };
  const checkedOutAt = new Date('2026-06-12T08:00:00.000Z');
  const checkedOutStay = {
    ...checkedInStay,
    status: StayStatus.CHECKED_OUT,
    checkedOutAt,
    checkedOutByUserId: 1,
    reservation: {
      ...checkedInStay.reservation,
      status: ReservationStatus.CHECKED_OUT,
    },
    checkedOutBy: {
      id: 1,
      email: 'admin@demo-hotel.com',
      fullName: 'Admin User',
    },
    roomAssignments: [
      {
        ...checkedInStay.roomAssignments[0],
        status: StayRoomAssignmentStatus.RELEASED,
        releasedAt: checkedOutAt,
        releasedByUserId: 1,
        room: {
          ...occupiedRoom,
          occupancyStatus: RoomOccupancyStatus.VACANT,
          cleaningStatus: RoomCleaningStatus.DIRTY,
        },
        reservationRoom: {
          ...checkedInStay.roomAssignments[0].reservationRoom,
          status: ReservationRoomStatus.CHECKED_OUT,
        },
      },
    ],
  };
  const checkoutHousekeepingTask = {
    id: 80,
    taskNumber: 'HKT-20260610-123450',
    roomId: 9,
    type: HousekeepingTaskType.CHECKOUT_CLEANING,
    status: HousekeepingTaskStatus.PENDING,
    priority: HousekeepingPriority.NORMAL,
    sourceType: 'STAY_CHECKOUT',
    sourceId: 40,
  };
  const settledFolio = {
    id: 70,
    folioNumber: 'FOL-20260610-123450',
    stayId: 40,
    guestId: 12,
    status: FolioStatus.OPEN,
    subtotalAmount: new Prisma.Decimal(200),
    discountAmount: new Prisma.Decimal(0),
    taxAmount: new Prisma.Decimal(0),
    serviceAmount: new Prisma.Decimal(0),
    totalAmount: new Prisma.Decimal(200),
    paidAmount: new Prisma.Decimal(200),
    balanceAmount: new Prisma.Decimal(0),
    openedAt: new Date('2026-06-10T08:05:00.000Z'),
    closedAt: null,
    openedByUserId: 1,
    closedByUserId: null,
    createdAt: new Date('2026-06-10T08:05:00.000Z'),
    updatedAt: new Date('2026-06-10T08:05:00.000Z'),
    stay: {
      id: 40,
      stayNumber: 'STAY-20260610-123450',
      reservationId: 20,
      guestId: 12,
      status: StayStatus.ACTIVE,
      checkedInAt: new Date('2026-06-10T08:00:00.000Z'),
      expectedCheckOutDate: new Date('2026-06-12T00:00:00.000Z'),
    },
    guest: reservation.guest,
    openedBy: {
      id: 1,
      email: 'admin@demo-hotel.com',
      fullName: 'Admin User',
    },
    closedBy: null,
  };
  const unsettledFolio = {
    ...settledFolio,
    paidAmount: new Prisma.Decimal(50),
    balanceAmount: new Prisma.Decimal(150),
  };
  const extendedStay = {
    ...checkedInStay,
    expectedCheckOutDate: new Date('2026-06-15T00:00:00.000Z'),
    reservation: {
      ...checkedInStay.reservation,
      checkOutDate: new Date('2026-06-15T00:00:00.000Z'),
    },
  };

  let service: StaysService;
  let staysRepository: {
    findStayByReservationId: jest.Mock;
    findStayByStayNumber: jest.Mock;
    findStay: jest.Mock;
    listStays: jest.Mock;
    runInTransaction: jest.Mock;
    createStay: jest.Mock;
    updateStay: jest.Mock;
  };
  let stayRoomAssignmentsRepository: {
    createAssignment: jest.Mock;
    findAssignment: jest.Mock;
    listActiveAssignmentsForStay: jest.Mock;
    updateAssignment: jest.Mock;
  };
  let reservationsRepository: {
    findReservation: jest.Mock;
    updateReservation: jest.Mock;
  };
  let reservationRoomsRepository: {
    findReservationRoom: jest.Mock;
    updateReservationRoom: jest.Mock;
  };
  let reservationAvailabilityRepository: {
    countOverlappingRoomReservations: jest.Mock;
  };
  let roomsRepository: {
    findRoom: jest.Mock;
    updateRoom: jest.Mock;
    createStatusLogs: jest.Mock;
  };
  let foliosRepository: {
    findByStayId: jest.Mock;
    updateFolio: jest.Mock;
  };
  let housekeepingService: {
    createCheckoutCleaningTaskFromStay: jest.Mock;
  };
  let auditLogsService: {
    record: jest.Mock;
  };

  beforeEach(async () => {
    staysRepository = {
      findStayByReservationId: jest.fn().mockResolvedValue(null),
      findStayByStayNumber: jest.fn().mockResolvedValue(null),
      findStay: jest.fn().mockResolvedValue(checkedInStay),
      listStays: jest.fn().mockResolvedValue([1, [checkedInStay]]),
      runInTransaction: jest
        .fn()
        .mockImplementation((operation) => operation({ transaction: true })),
      createStay: jest.fn().mockResolvedValue({ id: checkedInStay.id }),
      updateStay: jest.fn(),
    };
    stayRoomAssignmentsRepository = {
      createAssignment: jest.fn(),
      findAssignment: jest
        .fn()
        .mockResolvedValue(checkedInStay.roomAssignments[0]),
      listActiveAssignmentsForStay: jest
        .fn()
        .mockResolvedValue(checkedInStay.roomAssignments),
      updateAssignment: jest.fn(),
    };
    reservationsRepository = {
      findReservation: jest.fn().mockResolvedValue(reservation),
      updateReservation: jest.fn(),
    };
    reservationRoomsRepository = {
      findReservationRoom: jest.fn().mockResolvedValue(secondReservationRoom),
      updateReservationRoom: jest.fn(),
    };
    reservationAvailabilityRepository = {
      countOverlappingRoomReservations: jest.fn().mockResolvedValue(0),
    };
    roomsRepository = {
      findRoom: jest.fn().mockResolvedValue(room),
      updateRoom: jest.fn(),
      createStatusLogs: jest.fn(),
    };
    foliosRepository = {
      findByStayId: jest.fn().mockResolvedValue(null),
      updateFolio: jest.fn().mockResolvedValue({
        ...settledFolio,
        status: FolioStatus.CLOSED,
        closedAt: checkedOutAt,
        closedByUserId: 1,
      }),
    };
    housekeepingService = {
      createCheckoutCleaningTaskFromStay: jest.fn().mockResolvedValue({
        task: checkoutHousekeepingTask,
        created: true,
      }),
    };
    auditLogsService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaysService,
        {
          provide: StaysRepository,
          useValue: staysRepository,
        },
        {
          provide: StayRoomAssignmentsRepository,
          useValue: stayRoomAssignmentsRepository,
        },
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
          provide: RoomsRepository,
          useValue: roomsRepository,
        },
        {
          provide: FoliosRepository,
          useValue: foliosRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<StaysService>(StaysService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lists stays with filters and pagination', async () => {
    const result = await service.list(currentUser, {
      page: 2,
      limit: 5,
      search: ' Marta ',
      status: StayStatus.ACTIVE,
      guestId: 12,
      checkedInFrom: '2026-06-01',
      checkedInTo: '2026-06-30',
      expectedCheckOutFrom: '2026-06-02',
      expectedCheckOutTo: '2026-07-01',
    });

    expect(staysRepository.listStays).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
      search: 'Marta',
      status: StayStatus.ACTIVE,
      guestId: 12,
      checkedInFrom: new Date('2026-06-01T00:00:00.000Z'),
      checkedInTo: new Date('2026-06-30T00:00:00.000Z'),
      expectedCheckOutFrom: new Date('2026-06-02T00:00:00.000Z'),
      expectedCheckOutTo: new Date('2026-07-01T00:00:00.000Z'),
    });
    expect(result).toMatchObject({
      items: [
        {
          id: 40,
          stayNumber: 'STAY-20260610-123450',
        },
      ],
      pagination: {
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('lists active stays with active status enforced', async () => {
    await service.listActive(currentUser, {
      status: StayStatus.CHECKED_OUT,
    });

    expect(staysRepository.listStays).toHaveBeenCalledWith(
      expect.objectContaining({
        status: StayStatus.ACTIVE,
      }),
    );
  });

  it('returns in-house guests from active stays', async () => {
    const result = await service.listInHouseGuests(currentUser, {});

    expect(staysRepository.listStays).toHaveBeenCalledWith(
      expect.objectContaining({
        status: StayStatus.ACTIVE,
      }),
    );
    expect(result.items).toEqual([
      {
        guest: checkedInStay.guest,
        stay: {
          id: checkedInStay.id,
          stayNumber: checkedInStay.stayNumber,
          status: checkedInStay.status,
          checkedInAt: checkedInStay.checkedInAt,
          expectedCheckOutDate: checkedInStay.expectedCheckOutDate,
        },
        reservation: checkedInStay.reservation,
        currentRooms: [
          {
            assignmentId: 50,
            roomId: 9,
            reservationRoomId: 30,
            assignedAt: checkedInStay.roomAssignments[0].assignedAt,
            room: occupiedRoom,
          },
        ],
      },
    ]);
  });

  it('gets one stay by id', async () => {
    const result = await service.getById(currentUser, 40);

    expect(staysRepository.findStay).toHaveBeenCalledWith(40);
    expect(result).toMatchObject({
      id: 40,
      stayNumber: 'STAY-20260610-123450',
    });
  });

  it('rejects missing stay lookup', async () => {
    staysRepository.findStay.mockResolvedValueOnce(null);

    await expect(service.getById(currentUser, 999)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('assigns an additional room to an active stay', async () => {
    roomsRepository.findRoom.mockResolvedValueOnce(destinationRoom);

    await service.assignRoom(currentUser, 40, {
      reservationRoomId: 31,
      roomId: 10,
      reason: ' Additional family room. ',
    });

    expect(reservationRoomsRepository.findReservationRoom).toHaveBeenCalledWith(
      31,
    );
    expect(
      reservationAvailabilityRepository.countOverlappingRoomReservations,
    ).toHaveBeenCalledWith({
      roomId: 10,
      checkInDate: checkedInStay.reservation.checkInDate,
      checkOutDate: checkedInStay.expectedCheckOutDate,
      excludeReservationId: checkedInStay.reservationId,
    });
    expect(stayRoomAssignmentsRepository.createAssignment).toHaveBeenCalledWith(
      {
        stayId: 40,
        roomId: 10,
        reservationRoomId: 31,
        assignedByUserId: 1,
        reason: 'Additional family room.',
      },
      { transaction: true },
    );
    expect(
      reservationRoomsRepository.updateReservationRoom,
    ).toHaveBeenCalledWith(
      31,
      {
        status: ReservationRoomStatus.CHECKED_IN,
        roomId: 10,
      },
      { transaction: true },
    );
    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(
      10,
      {
        occupancyStatus: RoomOccupancyStatus.OCCUPIED,
      },
      { transaction: true },
    );
    expect(roomsRepository.createStatusLogs).toHaveBeenCalledWith(
      [
        {
          roomId: 10,
          actorUserId: 1,
          field: 'occupancyStatus',
          oldValue: RoomOccupancyStatus.VACANT,
          newValue: RoomOccupancyStatus.OCCUPIED,
          reason: 'Stay room assignment',
        },
      ],
      { transaction: true },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'stays.room_assigned',
        entityType: 'Stay',
        entityId: '40',
      }),
    );
  });

  it('rejects assigning a room to an inactive stay', async () => {
    staysRepository.findStay.mockResolvedValueOnce(checkedOutStay);

    await expect(
      service.assignRoom(currentUser, 40, {
        roomId: 10,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('updates an active room assignment reason', async () => {
    await service.updateRoomAssignment(currentUser, 40, 50, {
      reason: ' Corrected assignment note. ',
    });

    expect(stayRoomAssignmentsRepository.findAssignment).toHaveBeenCalledWith(
      50,
    );
    expect(stayRoomAssignmentsRepository.updateAssignment).toHaveBeenCalledWith(
      50,
      {
        reason: 'Corrected assignment note.',
      },
      { transaction: true },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'stays.room_assignment_updated',
        entityType: 'StayRoomAssignment',
        entityId: '50',
      }),
    );
  });

  it('moves an active stay room to an available room', async () => {
    roomsRepository.findRoom.mockResolvedValueOnce(destinationRoom);

    await service.moveRoom(currentUser, 40, {
      fromAssignmentId: 50,
      toRoomId: 10,
      reason: ' Guest requested quieter room. ',
    });

    expect(stayRoomAssignmentsRepository.findAssignment).toHaveBeenCalledWith(
      50,
    );
    expect(stayRoomAssignmentsRepository.updateAssignment).toHaveBeenCalledWith(
      50,
      {
        status: StayRoomAssignmentStatus.RELEASED,
        releasedAt: expect.any(Date),
        releasedByUserId: 1,
        reason: 'Guest requested quieter room.',
      },
      { transaction: true },
    );
    expect(stayRoomAssignmentsRepository.createAssignment).toHaveBeenCalledWith(
      {
        stayId: 40,
        roomId: 10,
        reservationRoomId: 30,
        assignedByUserId: 1,
        reason: 'Guest requested quieter room.',
      },
      { transaction: true },
    );
    expect(
      reservationRoomsRepository.updateReservationRoom,
    ).toHaveBeenCalledWith(
      30,
      {
        status: ReservationRoomStatus.CHECKED_IN,
        roomId: 10,
      },
      { transaction: true },
    );
    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(
      9,
      {
        occupancyStatus: RoomOccupancyStatus.VACANT,
        cleaningStatus: RoomCleaningStatus.DIRTY,
      },
      { transaction: true },
    );
    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(
      10,
      {
        occupancyStatus: RoomOccupancyStatus.OCCUPIED,
      },
      { transaction: true },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'stays.room_moved',
        entityType: 'Stay',
        entityId: '40',
      }),
    );
  });

  it('rejects moving to an unavailable destination room', async () => {
    roomsRepository.findRoom.mockResolvedValueOnce({
      ...destinationRoom,
      maintenanceStatus: RoomMaintenanceStatus.OUT_OF_SERVICE,
    });

    await expect(
      service.moveRoom(currentUser, 40, {
        fromAssignmentId: 50,
        toRoomId: 10,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('extends an active stay when assigned rooms are available', async () => {
    staysRepository.findStay
      .mockResolvedValueOnce(checkedInStay)
      .mockResolvedValueOnce(extendedStay);

    const result = await service.extendStay(currentUser, 40, {
      newExpectedCheckOutDate: '2026-06-15',
      reason: ' Guest requested one additional night. ',
    });

    expect(
      stayRoomAssignmentsRepository.listActiveAssignmentsForStay,
    ).toHaveBeenCalledWith(40);
    expect(
      reservationAvailabilityRepository.countOverlappingRoomReservations,
    ).toHaveBeenCalledWith({
      roomId: 9,
      checkInDate: checkedInStay.expectedCheckOutDate,
      checkOutDate: new Date('2026-06-15T00:00:00.000Z'),
      excludeReservationId: checkedInStay.reservationId,
      excludeReservationRoomId: 30,
    });
    expect(reservationsRepository.updateReservation).toHaveBeenCalledWith(
      20,
      {
        checkOutDate: new Date('2026-06-15T00:00:00.000Z'),
      },
      { transaction: true },
    );
    expect(staysRepository.updateStay).toHaveBeenCalledWith(
      40,
      {
        expectedCheckOutDate: new Date('2026-06-15T00:00:00.000Z'),
      },
      { transaction: true },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 1,
        action: 'stays.extended',
        entityType: 'Stay',
        entityId: '40',
        metadata: expect.objectContaining({
          previousExpectedCheckOutDate: '2026-06-12T00:00:00.000Z',
          newExpectedCheckOutDate: '2026-06-15T00:00:00.000Z',
          activeRoomIds: [9],
          reason: 'Guest requested one additional night.',
        }),
      }),
    );
    expect(result).toMatchObject({
      id: 40,
      expectedCheckOutDate: new Date('2026-06-15T00:00:00.000Z'),
      reservation: {
        checkOutDate: new Date('2026-06-15T00:00:00.000Z'),
      },
    });
  });

  it('rejects stay extension when the checkout date does not move forward', async () => {
    await expect(
      service.extendStay(currentUser, 40, {
        newExpectedCheckOutDate: '2026-06-12',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(staysRepository.runInTransaction).not.toHaveBeenCalled();
  });

  it('rejects stay extension when an assigned room has a future overlap', async () => {
    reservationAvailabilityRepository.countOverlappingRoomReservations.mockResolvedValueOnce(
      1,
    );

    await expect(
      service.extendStay(currentUser, 40, {
        newExpectedCheckOutDate: '2026-06-15',
      }),
    ).rejects.toThrow(ConflictException);
    expect(staysRepository.runInTransaction).not.toHaveBeenCalled();
  });

  it('checks out an active stay and marks the room vacant dirty', async () => {
    staysRepository.findStay
      .mockResolvedValueOnce(checkedInStay)
      .mockResolvedValueOnce(checkedOutStay);

    const result = await service.checkOut(currentUser, 40, {
      notes: ' Guest settled at front desk. ',
    });

    expect(staysRepository.findStay).toHaveBeenCalledWith(40);
    expect(foliosRepository.findByStayId).toHaveBeenCalledWith(40);
    expect(
      stayRoomAssignmentsRepository.listActiveAssignmentsForStay,
    ).toHaveBeenCalledWith(40);
    expect(stayRoomAssignmentsRepository.updateAssignment).toHaveBeenCalledWith(
      50,
      {
        status: StayRoomAssignmentStatus.RELEASED,
        releasedAt: expect.any(Date),
        releasedByUserId: 1,
        reason: 'Guest settled at front desk.',
      },
      { transaction: true },
    );
    expect(
      reservationRoomsRepository.updateReservationRoom,
    ).toHaveBeenCalledWith(
      30,
      {
        status: ReservationRoomStatus.CHECKED_OUT,
      },
      { transaction: true },
    );
    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(
      9,
      {
        occupancyStatus: RoomOccupancyStatus.VACANT,
        cleaningStatus: RoomCleaningStatus.DIRTY,
      },
      { transaction: true },
    );
    expect(roomsRepository.createStatusLogs).toHaveBeenCalledWith(
      [
        {
          roomId: 9,
          actorUserId: 1,
          field: 'occupancyStatus',
          oldValue: RoomOccupancyStatus.OCCUPIED,
          newValue: RoomOccupancyStatus.VACANT,
          reason: 'Stay checkout',
        },
        {
          roomId: 9,
          actorUserId: 1,
          field: 'cleaningStatus',
          oldValue: RoomCleaningStatus.CLEAN,
          newValue: RoomCleaningStatus.DIRTY,
          reason: 'Stay checkout',
        },
      ],
      { transaction: true },
    );
    expect(reservationsRepository.updateReservation).toHaveBeenCalledWith(
      20,
      {
        status: ReservationStatus.CHECKED_OUT,
      },
      { transaction: true },
    );
    expect(staysRepository.updateStay).toHaveBeenCalledWith(
      40,
      {
        status: StayStatus.CHECKED_OUT,
        checkedOutAt: expect.any(Date),
        checkedOutByUserId: 1,
        notes: 'Guest settled at front desk.',
      },
      { transaction: true },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 1,
        action: 'stays.checked_out',
        entityType: 'Stay',
        entityId: '40',
        metadata: expect.objectContaining({
          folioId: null,
          folioClosed: false,
        }),
      }),
    );
    expect(result).toMatchObject({
      id: 40,
      status: StayStatus.CHECKED_OUT,
      checkedOutByUserId: 1,
      roomAssignments: [
        {
          status: StayRoomAssignmentStatus.RELEASED,
          room: {
            occupancyStatus: RoomOccupancyStatus.VACANT,
            cleaningStatus: RoomCleaningStatus.DIRTY,
          },
        },
      ],
    });
  });

  it('rejects checkout when an open folio has a non-zero balance', async () => {
    foliosRepository.findByStayId.mockResolvedValueOnce(unsettledFolio);

    await expect(service.checkOut(currentUser, 40, {})).rejects.toThrow(
      ConflictException,
    );

    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 1,
        action: 'stays.checkout_blocked_unsettled_folio',
        entityType: 'Stay',
        entityId: '40',
        metadata: expect.objectContaining({
          folioId: 70,
          folioNumber: 'FOL-20260610-123450',
          balanceAmount: '150',
        }),
      }),
    );
    expect(
      stayRoomAssignmentsRepository.listActiveAssignmentsForStay,
    ).not.toHaveBeenCalled();
    expect(staysRepository.runInTransaction).not.toHaveBeenCalled();
  });

  it('checks out and closes a settled open folio when requested', async () => {
    foliosRepository.findByStayId.mockResolvedValueOnce(settledFolio);
    staysRepository.findStay
      .mockResolvedValueOnce(checkedInStay)
      .mockResolvedValueOnce(checkedOutStay);

    await service.checkOut(currentUser, 40, {
      notes: ' Settled. ',
      closeFolio: true,
    });

    expect(foliosRepository.updateFolio).toHaveBeenCalledWith(
      70,
      {
        status: FolioStatus.CLOSED,
        closedAt: expect.any(Date),
        closedByUserId: 1,
      },
      { transaction: true },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 1,
        action: 'folios.closed',
        entityType: 'Folio',
        entityId: '70',
        metadata: expect.objectContaining({
          source: 'stay_checkout',
          notes: 'Settled.',
        }),
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 1,
        action: 'stays.checked_out',
        entityType: 'Stay',
        entityId: '40',
        metadata: expect.objectContaining({
          folioId: 70,
          folioClosed: true,
        }),
      }),
    );
  });

  it('rejects checkout for inactive stays', async () => {
    staysRepository.findStay.mockResolvedValueOnce(checkedOutStay);

    await expect(service.checkOut(currentUser, 40, {})).rejects.toThrow(
      ConflictException,
    );
    expect(staysRepository.runInTransaction).not.toHaveBeenCalled();
  });

  it('rejects checkout when no active assignments exist', async () => {
    stayRoomAssignmentsRepository.listActiveAssignmentsForStay.mockResolvedValue(
      [],
    );

    await expect(service.checkOut(currentUser, 40, {})).rejects.toThrow(
      ConflictException,
    );
    expect(staysRepository.runInTransaction).not.toHaveBeenCalled();
  });

  it('rejects unsupported force checkout requests', async () => {
    await expect(
      service.checkOut(currentUser, 40, { forceCheckout: true }),
    ).rejects.toThrow(BadRequestException);
    expect(staysRepository.findStay).not.toHaveBeenCalled();
  });

  it('checks in a confirmed reservation with a physical room assignment', async () => {
    const result = await service.checkInReservation(currentUser, 20, {
      roomAssignments: [
        {
          reservationRoomId: 30,
          roomId: 9,
        },
      ],
      notes: ' Guest arrived. ',
    });

    expect(reservationsRepository.findReservation).toHaveBeenCalledWith(20);
    expect(staysRepository.findStayByReservationId).toHaveBeenCalledWith(20);
    expect(roomsRepository.findRoom).toHaveBeenCalledWith(9);
    expect(
      reservationAvailabilityRepository.countOverlappingRoomReservations,
    ).toHaveBeenCalledWith({
      roomId: 9,
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      excludeReservationId: reservation.id,
    });
    expect(staysRepository.createStay).toHaveBeenCalledWith(
      expect.objectContaining({
        reservationId: 20,
        guestId: 12,
        expectedCheckOutDate: reservation.checkOutDate,
        checkedInByUserId: 1,
        notes: 'Guest arrived.',
      }),
      { transaction: true },
    );
    expect(stayRoomAssignmentsRepository.createAssignment).toHaveBeenCalledWith(
      {
        stayId: 40,
        roomId: 9,
        reservationRoomId: 30,
        assignedByUserId: 1,
        reason: 'Guest arrived.',
      },
      { transaction: true },
    );
    expect(
      reservationRoomsRepository.updateReservationRoom,
    ).toHaveBeenCalledWith(
      30,
      {
        status: ReservationRoomStatus.CHECKED_IN,
        roomId: 9,
      },
      { transaction: true },
    );
    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(
      9,
      {
        occupancyStatus: RoomOccupancyStatus.OCCUPIED,
      },
      { transaction: true },
    );
    expect(roomsRepository.createStatusLogs).toHaveBeenCalledWith(
      [
        {
          roomId: 9,
          actorUserId: 1,
          field: 'occupancyStatus',
          oldValue: RoomOccupancyStatus.VACANT,
          newValue: RoomOccupancyStatus.OCCUPIED,
          reason: 'Reservation check-in',
        },
      ],
      { transaction: true },
    );
    expect(reservationsRepository.updateReservation).toHaveBeenCalledWith(
      20,
      {
        status: ReservationStatus.CHECKED_IN,
      },
      { transaction: true },
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 1,
        action: 'stays.checked_in',
        entityType: 'Stay',
        entityId: '40',
      }),
    );
    expect(result).toMatchObject({
      id: 40,
      reservationId: 20,
      status: StayStatus.ACTIVE,
      roomAssignments: [
        {
          reservationRoomId: 30,
          roomId: 9,
        },
      ],
    });
  });

  it('uses an existing reservation room assignment when no override is provided', async () => {
    await service.checkInReservation(currentUser, 20, {});

    expect(roomsRepository.findRoom).toHaveBeenCalledWith(9);
  });

  it('rejects a non-confirmed reservation', async () => {
    reservationsRepository.findReservation.mockResolvedValue({
      ...reservation,
      status: ReservationStatus.DRAFT,
    });

    await expect(
      service.checkInReservation(currentUser, 20, {}),
    ).rejects.toThrow(ConflictException);
    expect(staysRepository.runInTransaction).not.toHaveBeenCalled();
  });

  it('rejects an inactive guest', async () => {
    reservationsRepository.findReservation.mockResolvedValue({
      ...reservation,
      guest: {
        ...reservation.guest,
        status: GuestStatus.INACTIVE,
      },
    });

    await expect(
      service.checkInReservation(currentUser, 20, {}),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a reservation that already has a stay', async () => {
    staysRepository.findStayByReservationId.mockResolvedValue(checkedInStay);

    await expect(
      service.checkInReservation(currentUser, 20, {}),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects a missing reservation', async () => {
    reservationsRepository.findReservation.mockResolvedValue(null);

    await expect(
      service.checkInReservation(currentUser, 999, {}),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects a dirty room', async () => {
    roomsRepository.findRoom.mockResolvedValue({
      ...room,
      cleaningStatus: RoomCleaningStatus.DIRTY,
    });

    await expect(
      service.checkInReservation(currentUser, 20, {}),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects an occupied room', async () => {
    roomsRepository.findRoom.mockResolvedValue({
      ...room,
      occupancyStatus: RoomOccupancyStatus.OCCUPIED,
    });

    await expect(
      service.checkInReservation(currentUser, 20, {}),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects a room already reserved by another reservation', async () => {
    reservationAvailabilityRepository.countOverlappingRoomReservations.mockResolvedValue(
      1,
    );

    await expect(
      service.checkInReservation(currentUser, 20, {}),
    ).rejects.toThrow(ConflictException);
  });
});
