import { Test, TestingModule } from '@nestjs/testing';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FloorsService } from './floors.service';
import { FloorsRepository } from './repositories/floors.repository';

describe('FloorsService', () => {
  let service: FloorsService;
  let floorsRepository: {
    createFloor: jest.Mock;
    findByName: jest.Mock;
    listFloors: jest.Mock;
    findFloor: jest.Mock;
    updateFloor: jest.Mock;
    countActiveRooms: jest.Mock;
  };
  let auditLogsService: {
    record: jest.Mock;
  };

  const now = new Date('2026-05-25T00:00:00.000Z');
  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: 3,
    tokenVersion: 0,
  };
  const floor = {
    id: 10,
    number: 1,
    name: 'First Floor',
    description: 'Main rooms',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(async () => {
    floorsRepository = {
      createFloor: jest.fn().mockResolvedValue(floor),
      findByName: jest.fn().mockResolvedValue(null),
      listFloors: jest.fn().mockResolvedValue([1, [floor]]),
      findFloor: jest.fn().mockResolvedValue(floor),
      updateFloor: jest.fn().mockResolvedValue({
        ...floor,
        name: 'Updated Floor',
      }),
      countActiveRooms: jest.fn().mockResolvedValue(0),
    };
    auditLogsService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FloorsService,
        {
          provide: FloorsRepository,
          useValue: floorsRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<FloorsService>(FloorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a floor with a unique trimmed name and records audit', async () => {
    const result = await service.create(currentUser, {
      name: ' First Floor ',
      number: 1,
      description: ' Main rooms ',
    });

    expect(result).toMatchObject({
      id: 10,
      name: 'First Floor',
    });
    expect(floorsRepository.findByName).toHaveBeenCalledWith('First Floor');
    expect(floorsRepository.createFloor).toHaveBeenCalledWith({
      name: 'First Floor',
      number: 1,
      description: 'Main rooms',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'floors.created',
      entityType: 'Floor',
      entityId: '10',
      metadata: {
        name: 'First Floor',
        number: 1,
      },
    });
  });

  it('rejects duplicate floor names', async () => {
    floorsRepository.findByName.mockResolvedValue(floor);

    await expect(
      service.create(currentUser, {
        name: 'First Floor',
      }),
    ).rejects.toThrow('Floor name already exists.');
  });

  it('lists floors with pagination and filters', async () => {
    await service.list(currentUser, {
      page: 2,
      limit: 10,
      search: ' first ',
      isActive: true,
    });

    expect(floorsRepository.listFloors).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'first',
      isActive: true,
    });
  });

  it('updates floor profile fields and records audit metadata', async () => {
    await service.update(currentUser, 10, {
      name: ' Updated Floor ',
      description: null,
    });

    expect(floorsRepository.findByName).toHaveBeenCalledWith(
      'Updated Floor',
      10,
    );
    expect(floorsRepository.updateFloor).toHaveBeenCalledWith(10, {
      name: 'Updated Floor',
      description: null,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 1,
        action: 'floors.updated',
        entityType: 'Floor',
        entityId: '10',
      }),
    );
  });

  it('throws when a floor is missing', async () => {
    floorsRepository.findFloor.mockResolvedValue(null);

    await expect(service.getById(currentUser, 404)).rejects.toThrow(
      'Floor was not found.',
    );
  });

  it('blocks deactivation when active rooms are assigned', async () => {
    floorsRepository.countActiveRooms.mockResolvedValue(2);

    await expect(service.remove(currentUser, 10)).rejects.toThrow(
      'Cannot deactivate a floor with active rooms assigned.',
    );
    expect(floorsRepository.updateFloor).not.toHaveBeenCalled();
  });

  it('soft-deactivates an unused floor and records audit', async () => {
    floorsRepository.updateFloor.mockResolvedValue({
      ...floor,
      isActive: false,
    });

    const result = await service.remove(currentUser, 10);

    expect(result).toMatchObject({
      id: 10,
      isActive: false,
    });
    expect(floorsRepository.updateFloor).toHaveBeenCalledWith(10, {
      isActive: false,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith({
      actorUserId: 1,
      action: 'floors.deactivated',
      entityType: 'Floor',
      entityId: '10',
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
});
