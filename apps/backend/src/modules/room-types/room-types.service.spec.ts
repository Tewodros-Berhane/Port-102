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
