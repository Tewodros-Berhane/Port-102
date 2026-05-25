import { Test, TestingModule } from '@nestjs/testing';

import {
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FloorsRepository } from '../floors/repositories/floors.repository';
import { RoomTypesRepository } from '../room-types/repositories/room-types.repository';
import { RoomsRepository } from './repositories/rooms.repository';
import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
  let service: RoomsService;
  let roomsRepository: {
    createRoom: jest.Mock;
    findByRoomNumber: jest.Mock;
    listRooms: jest.Mock;
    findRoom: jest.Mock;
    updateRoom: jest.Mock;
    createStatusLogs: jest.Mock;
    listStatusLogs: jest.Mock;
    countRooms: jest.Mock;
  };
  let floorsRepository: {
    findFloor: jest.Mock;
  };
  let roomTypesRepository: {
    findRoomType: jest.Mock;
  };
  let auditLogsService: {
    record: jest.Mock;
  };

  const now = new Date('2026-05-26T00:00:00.000Z');
  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: 3,
    tokenVersion: 0,
  };
  const floor = {
    id: 3,
    number: 1,
    name: 'First Floor',
    isActive: true,
  };
  const roomType = {
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
    floorId: 3,
    roomTypeId: 4,
    occupancyStatus: RoomOccupancyStatus.VACANT,
    cleaningStatus: RoomCleaningStatus.CLEAN,
    maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
    notes: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    floor,
    roomType,
  };

  beforeEach(async () => {
    roomsRepository = {
      createRoom: jest.fn().mockResolvedValue(room),
      findByRoomNumber: jest.fn().mockResolvedValue(null),
      listRooms: jest.fn().mockResolvedValue([1, [room]]),
      findRoom: jest.fn().mockResolvedValue(room),
      updateRoom: jest.fn().mockResolvedValue({
        ...room,
        displayName: 'Updated Deluxe 101',
      }),
      createStatusLogs: jest.fn(),
      listStatusLogs: jest.fn().mockResolvedValue([0, []]),
      countRooms: jest.fn().mockResolvedValue(0),
    };
    floorsRepository = {
      findFloor: jest.fn().mockResolvedValue(floor),
    };
    roomTypesRepository = {
      findRoomType: jest.fn().mockResolvedValue(roomType),
    };
    auditLogsService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        {
          provide: RoomsRepository,
          useValue: roomsRepository,
        },
        {
          provide: FloorsRepository,
          useValue: floorsRepository,
        },
        {
          provide: RoomTypesRepository,
          useValue: roomTypesRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates rooms with active floor and active room type validation', async () => {
    const result = await service.create(currentUser, {
      roomNumber: ' 101 ',
      displayName: ' Deluxe 101 ',
      floorId: 3,
      roomTypeId: 4,
      notes: ' Near elevator ',
    });

    expect(result).toMatchObject({
      id: 9,
      roomNumber: '101',
      roomType: {
        baseRate: '125.50',
      },
    });
    expect(roomsRepository.findByRoomNumber).toHaveBeenCalledWith('101');
    expect(roomTypesRepository.findRoomType).toHaveBeenCalledWith(4);
    expect(floorsRepository.findFloor).toHaveBeenCalledWith(3);
    expect(roomsRepository.createRoom).toHaveBeenCalledWith({
      roomNumber: '101',
      displayName: 'Deluxe 101',
      floorId: 3,
      roomTypeId: 4,
      notes: 'Near elevator',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'rooms.created',
      entityType: 'Room',
      entityId: '9',
      metadata: {
        roomNumber: '101',
        floorId: 3,
        roomTypeId: 4,
      },
    });
  });

  it('rejects duplicate room numbers', async () => {
    roomsRepository.findByRoomNumber.mockResolvedValue(room);

    await expect(
      service.create(currentUser, {
        roomNumber: '101',
        roomTypeId: 4,
      }),
    ).rejects.toThrow('Room number already exists.');
  });

  it('rejects inactive floors', async () => {
    floorsRepository.findFloor.mockResolvedValue({
      ...floor,
      isActive: false,
    });

    await expect(
      service.create(currentUser, {
        roomNumber: '101',
        floorId: 3,
        roomTypeId: 4,
      }),
    ).rejects.toThrow('Cannot assign an inactive floor.');
  });

  it('rejects inactive room types', async () => {
    roomTypesRepository.findRoomType.mockResolvedValue({
      ...roomType,
      isActive: false,
    });

    await expect(
      service.create(currentUser, {
        roomNumber: '101',
        roomTypeId: 4,
      }),
    ).rejects.toThrow('Cannot assign an inactive room type.');
  });

  it('lists rooms with pagination and filters', async () => {
    await service.list(currentUser, {
      page: 2,
      limit: 10,
      search: ' deluxe ',
      floorId: 3,
      roomTypeId: 4,
      occupancyStatus: RoomOccupancyStatus.VACANT,
      cleaningStatus: RoomCleaningStatus.CLEAN,
      maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      isActive: true,
    });

    expect(roomsRepository.listRooms).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'deluxe',
      floorId: 3,
      roomTypeId: 4,
      occupancyStatus: RoomOccupancyStatus.VACANT,
      cleaningStatus: RoomCleaningStatus.CLEAN,
      maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      isActive: true,
    });
  });

  it('updates room profile fields and validates changed assignments', async () => {
    await service.update(currentUser, 9, {
      roomNumber: ' 102 ',
      displayName: null,
      floorId: null,
      roomTypeId: 4,
      notes: ' Updated ',
    });

    expect(roomsRepository.findByRoomNumber).toHaveBeenCalledWith('102', 9);
    expect(roomTypesRepository.findRoomType).toHaveBeenCalledWith(4);
    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(9, {
      roomNumber: '102',
      displayName: null,
      floorId: null,
      roomTypeId: 4,
      notes: 'Updated',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'rooms.updated',
      }),
    );
  });

  it('throws when a room is missing', async () => {
    roomsRepository.findRoom.mockResolvedValue(null);

    await expect(service.getById(currentUser, 404)).rejects.toThrow(
      'Room was not found.',
    );
  });

  it('soft-deactivates rooms and records audit', async () => {
    roomsRepository.updateRoom.mockResolvedValue({
      ...room,
      isActive: false,
    });

    const result = await service.remove(currentUser, 9);

    expect(result).toMatchObject({
      id: 9,
      isActive: false,
    });
    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(9, {
      isActive: false,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'rooms.deactivated',
      entityType: 'Room',
      entityId: '9',
      metadata: {
        previous: {
          isActive: true,
        },
        changes: {
          isActive: false,
        },
      },
    });
  });

  it('updates room statuses, creates status logs, and records audit', async () => {
    roomsRepository.updateRoom.mockResolvedValue({
      ...room,
      cleaningStatus: RoomCleaningStatus.DIRTY,
      maintenanceStatus: RoomMaintenanceStatus.UNDER_MAINTENANCE,
    });

    const result = await service.updateStatus(currentUser, 9, {
      cleaningStatus: RoomCleaningStatus.DIRTY,
      maintenanceStatus: RoomMaintenanceStatus.UNDER_MAINTENANCE,
      reason: ' Leak inspection ',
    });

    expect(result).toMatchObject({
      cleaningStatus: RoomCleaningStatus.DIRTY,
      maintenanceStatus: RoomMaintenanceStatus.UNDER_MAINTENANCE,
    });
    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(9, {
      cleaningStatus: RoomCleaningStatus.DIRTY,
      maintenanceStatus: RoomMaintenanceStatus.UNDER_MAINTENANCE,
    });
    expect(roomsRepository.createStatusLogs).toHaveBeenCalledWith([
      {
        roomId: 9,
        actorUserId: 1,
        field: 'cleaningStatus',
        oldValue: RoomCleaningStatus.CLEAN,
        newValue: RoomCleaningStatus.DIRTY,
        reason: 'Leak inspection',
      },
      {
        roomId: 9,
        actorUserId: 1,
        field: 'maintenanceStatus',
        oldValue: RoomMaintenanceStatus.AVAILABLE,
        newValue: RoomMaintenanceStatus.UNDER_MAINTENANCE,
        reason: 'Leak inspection',
      },
    ]);
    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'rooms.status_updated',
      entityType: 'Room',
      entityId: '9',
      metadata: {
        previous: {
          cleaningStatus: RoomCleaningStatus.CLEAN,
          maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
        },
        changes: {
          cleaningStatus: RoomCleaningStatus.DIRTY,
          maintenanceStatus: RoomMaintenanceStatus.UNDER_MAINTENANCE,
        },
        reason: 'Leak inspection',
      },
    });
  });

  it('rejects status updates without a status field', async () => {
    await expect(
      service.updateStatus(currentUser, 9, {
        reason: 'No status change',
      }),
    ).rejects.toThrow('At least one room status field is required.');

    expect(roomsRepository.updateRoom).not.toHaveBeenCalled();
    expect(roomsRepository.createStatusLogs).not.toHaveBeenCalled();
  });

  it('marks rooms out of order', async () => {
    roomsRepository.updateRoom.mockResolvedValue({
      ...room,
      maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
    });

    await service.markOutOfOrder(currentUser, 9, {
      reason: 'AC repair',
    });

    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(9, {
      maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
    });
    expect(roomsRepository.createStatusLogs).toHaveBeenCalledWith([
      {
        roomId: 9,
        actorUserId: 1,
        field: 'maintenanceStatus',
        oldValue: RoomMaintenanceStatus.AVAILABLE,
        newValue: RoomMaintenanceStatus.OUT_OF_ORDER,
        reason: 'AC repair',
      },
    ]);
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'rooms.marked_out_of_order',
      }),
    );
  });

  it('clears rooms from out-of-order status', async () => {
    roomsRepository.findRoom.mockResolvedValue({
      ...room,
      maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
    });
    roomsRepository.updateRoom.mockResolvedValue(room);

    await service.clearOutOfOrder(currentUser, 9, {
      reason: 'Repair complete',
    });

    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(9, {
      maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
    });
    expect(roomsRepository.createStatusLogs).toHaveBeenCalledWith([
      {
        roomId: 9,
        actorUserId: 1,
        field: 'maintenanceStatus',
        oldValue: RoomMaintenanceStatus.OUT_OF_ORDER,
        newValue: RoomMaintenanceStatus.AVAILABLE,
        reason: 'Repair complete',
      },
    ]);
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'rooms.cleared_out_of_order',
      }),
    );
  });

  it('returns availability summary counts', async () => {
    roomsRepository.countRooms
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);

    const result = await service.getAvailabilitySummary(currentUser);

    expect(result).toMatchObject({
      total: 10,
      active: 8,
      inactive: 2,
      sellable: 5,
      unavailable: 3,
      occupied: 1,
      dirty: 2,
    });
    expect(roomsRepository.countRooms).toHaveBeenCalledWith({
      isActive: true,
      occupancyStatus: RoomOccupancyStatus.VACANT,
      cleaningStatus: {
        in: [RoomCleaningStatus.CLEAN, RoomCleaningStatus.INSPECTED],
      },
      maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
    });
  });

  it('returns status summary counts', async () => {
    roomsRepository.countRooms
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    const result = await service.getStatusSummary(currentUser);

    expect(result).toEqual({
      total: 10,
      active: 8,
      inactive: 2,
      occupancy: {
        vacant: 6,
        occupied: 2,
      },
      cleaning: {
        clean: 3,
        dirty: 4,
        inspected: 1,
      },
      maintenance: {
        available: 5,
        outOfOrder: 1,
        outOfService: 1,
        underMaintenance: 1,
      },
    });
  });

  it('lists status logs with pagination', async () => {
    const statusLog = {
      id: 18,
      roomId: 9,
      actorUserId: 1,
      field: 'maintenanceStatus',
      oldValue: RoomMaintenanceStatus.AVAILABLE,
      newValue: RoomMaintenanceStatus.OUT_OF_ORDER,
      reason: 'AC repair',
      createdAt: now,
      actorUser: {
        id: 1,
        email: 'admin@demo-hotel.com',
        fullName: 'Hotel Admin',
      },
    };
    roomsRepository.listStatusLogs.mockResolvedValue([1, [statusLog]]);

    const result = await service.listStatusLogs(currentUser, 9, {
      page: 2,
      limit: 20,
    });

    expect(roomsRepository.listStatusLogs).toHaveBeenCalledWith({
      roomId: 9,
      skip: 20,
      take: 20,
    });
    expect(result).toEqual({
      items: [
        {
          id: 18,
          roomId: 9,
          field: 'maintenanceStatus',
          oldValue: RoomMaintenanceStatus.AVAILABLE,
          newValue: RoomMaintenanceStatus.OUT_OF_ORDER,
          reason: 'AC repair',
          createdAt: now,
          actor: {
            id: 1,
            email: 'admin@demo-hotel.com',
            fullName: 'Hotel Admin',
          },
        },
      ],
      pagination: {
        page: 2,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
  });
});
