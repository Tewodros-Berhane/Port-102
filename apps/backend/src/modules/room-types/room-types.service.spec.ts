import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RoomAmenitiesRepository } from './repositories/room-amenities.repository';
import { RoomTypesRepository } from './repositories/room-types.repository';
import { RoomTypesService } from './room-types.service';

describe('RoomTypesService', () => {
  let service: RoomTypesService;
  let roomTypesRepository: {
    createRoomType: jest.Mock;
    findByCode: jest.Mock;
    listRoomTypes: jest.Mock;
    findRoomType: jest.Mock;
    updateRoomType: jest.Mock;
    countActiveRooms: jest.Mock;
    findAssignedAmenityIds: jest.Mock;
    assignAmenities: jest.Mock;
    removeAmenity: jest.Mock;
  };
  let roomAmenitiesRepository: {
    findAmenity: jest.Mock;
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
  const amenity = {
    id: 5,
    name: 'Wi-Fi',
    key: 'wifi',
    description: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  const roomType = {
    id: 11,
    name: 'Deluxe King',
    code: 'DLX-KING',
    description: 'Premium king room',
    baseOccupancy: 2,
    maxOccupancy: 3,
    baseRate: { toString: () => '125.50' },
    isActive: true,
    createdAt: now,
    updatedAt: now,
    amenities: [
      {
        createdAt: now,
        amenity,
      },
    ],
  };

  beforeEach(async () => {
    roomTypesRepository = {
      createRoomType: jest.fn().mockResolvedValue(roomType),
      findByCode: jest.fn().mockResolvedValue(null),
      listRoomTypes: jest.fn().mockResolvedValue([1, [roomType]]),
      findRoomType: jest.fn().mockResolvedValue(roomType),
      updateRoomType: jest.fn().mockResolvedValue({
        ...roomType,
        name: 'Updated Deluxe King',
      }),
      countActiveRooms: jest.fn().mockResolvedValue(0),
      findAssignedAmenityIds: jest.fn().mockResolvedValue([]),
      assignAmenities: jest.fn().mockResolvedValue({ count: 1 }),
      removeAmenity: jest.fn().mockResolvedValue({}),
    };
    roomAmenitiesRepository = {
      findAmenity: jest.fn().mockResolvedValue(amenity),
    };
    auditLogsService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomTypesService,
        {
          provide: RoomTypesRepository,
          useValue: roomTypesRepository,
        },
        {
          provide: RoomAmenitiesRepository,
          useValue: roomAmenitiesRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<RoomTypesService>(RoomTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates room types with normalized code and valid occupancy', async () => {
    const result = await service.create(currentUser, {
      name: ' Deluxe King ',
      code: ' dlx-king ',
      description: ' Premium king room ',
      baseOccupancy: 2,
      maxOccupancy: 3,
      baseRate: 125.5,
    });

    expect(result).toMatchObject({
      id: 11,
      code: 'DLX-KING',
      baseRate: '125.50',
    });
    expect(roomTypesRepository.findByCode).toHaveBeenCalledWith('DLX-KING');
    expect(roomTypesRepository.createRoomType).toHaveBeenCalledWith({
      name: 'Deluxe King',
      code: 'DLX-KING',
      description: 'Premium king room',
      baseOccupancy: 2,
      maxOccupancy: 3,
      baseRate: '125.50',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 1,
        action: 'room_types.created',
        entityType: 'RoomType',
        entityId: '11',
      }),
    );
  });

  it('rejects duplicate room type codes', async () => {
    roomTypesRepository.findByCode.mockResolvedValue(roomType);

    await expect(
      service.create(currentUser, {
        name: 'Deluxe King',
        code: 'DLX-KING',
      }),
    ).rejects.toThrow('Room type code already exists.');
  });

  it('rejects max occupancy lower than base occupancy', async () => {
    await expect(
      service.create(currentUser, {
        name: 'Deluxe King',
        code: 'DLX-KING',
        baseOccupancy: 3,
        maxOccupancy: 2,
      }),
    ).rejects.toThrow(
      'Max occupancy must be greater than or equal to base occupancy.',
    );
  });

  it('lists room types with pagination and filters', async () => {
    await service.list(currentUser, {
      page: 2,
      limit: 10,
      search: ' deluxe ',
      isActive: true,
    });

    expect(roomTypesRepository.listRoomTypes).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'deluxe',
      isActive: true,
    });
  });

  it('updates room type profile fields and records audit metadata', async () => {
    await service.update(currentUser, 11, {
      name: ' Updated Deluxe King ',
      code: 'upd-king',
      baseOccupancy: 2,
      maxOccupancy: 4,
      baseRate: null,
    });

    expect(roomTypesRepository.findByCode).toHaveBeenCalledWith('UPD-KING', 11);
    expect(roomTypesRepository.updateRoomType).toHaveBeenCalledWith(11, {
      name: 'Updated Deluxe King',
      code: 'UPD-KING',
      baseOccupancy: 2,
      maxOccupancy: 4,
      baseRate: null,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'room_types.updated',
      }),
    );
  });

  it('throws when a room type is missing', async () => {
    roomTypesRepository.findRoomType.mockResolvedValue(null);

    await expect(service.getById(currentUser, 404)).rejects.toThrow(
      'Room type was not found.',
    );
  });

  it('blocks deactivation when active rooms use the room type', async () => {
    roomTypesRepository.countActiveRooms.mockResolvedValue(2);

    await expect(service.remove(currentUser, 11)).rejects.toThrow(
      'Cannot deactivate a room type with active rooms assigned.',
    );
    expect(roomTypesRepository.updateRoomType).not.toHaveBeenCalled();
  });

  it('soft-deactivates unused room types', async () => {
    roomTypesRepository.updateRoomType.mockResolvedValue({
      ...roomType,
      isActive: false,
    });

    const result = await service.remove(currentUser, 11);

    expect(result).toMatchObject({
      id: 11,
      isActive: false,
    });
    expect(roomTypesRepository.updateRoomType).toHaveBeenCalledWith(11, {
      isActive: false,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'room_types.deactivated',
      }),
    );
  });

  it('assigns active amenities that are not already assigned', async () => {
    const result = await service.assignAmenities(currentUser, 11, {
      amenityIds: [5],
    });

    expect(result).toMatchObject({
      id: 11,
    });
    expect(roomAmenitiesRepository.findAmenity).toHaveBeenCalledWith(5);
    expect(roomTypesRepository.findAssignedAmenityIds).toHaveBeenCalledWith(
      11,
      [5],
    );
    expect(roomTypesRepository.assignAmenities).toHaveBeenCalledWith(11, [5]);
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'room_types.amenities_assigned',
      }),
    );
  });

  it('rejects duplicate room type amenity assignments', async () => {
    roomTypesRepository.findAssignedAmenityIds.mockResolvedValue([
      { amenityId: 5 },
    ]);

    await expect(
      service.assignAmenities(currentUser, 11, {
        amenityIds: [5],
      }),
    ).rejects.toThrow(
      'One or more amenities are already assigned to this room type.',
    );
  });

  it('removes an assigned room type amenity', async () => {
    roomTypesRepository.findAssignedAmenityIds.mockResolvedValue([
      { amenityId: 5 },
    ]);

    await service.removeAmenity(currentUser, 11, 5);

    expect(roomTypesRepository.removeAmenity).toHaveBeenCalledWith(11, 5);
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'room_types.amenity_removed',
      }),
    );
  });
});
