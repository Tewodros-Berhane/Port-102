import { Test, TestingModule } from '@nestjs/testing';

import {
  HousekeepingPriority,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  UserStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { HousekeepingTasksRepository } from './housekeeping-tasks.repository';

describe('HousekeepingTasksRepository', () => {
  let repository: HousekeepingTasksRepository;
  let prisma: {
    $transaction: jest.Mock;
    housekeepingTask: {
      create: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      housekeepingTask: {
        create: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HousekeepingTasksRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<HousekeepingTasksRepository>(
      HousekeepingTasksRepository,
    );
  });

  it('creates tasks through PrismaService', async () => {
    await repository.createTask({
      taskNumber: 'HKT-20260602-123450',
      roomId: 12,
      type: HousekeepingTaskType.MANUAL,
      status: HousekeepingTaskStatus.PENDING,
      priority: HousekeepingPriority.HIGH,
    });

    expect(prisma.housekeepingTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          taskNumber: 'HKT-20260602-123450',
          roomId: 12,
          type: HousekeepingTaskType.MANUAL,
          status: HousekeepingTaskStatus.PENDING,
          priority: HousekeepingPriority.HIGH,
        },
      }),
    );
  });

  it('finds tasks by id and task number', async () => {
    await repository.findTask(9);
    await repository.findByTaskNumber('HKT-20260602-123450');

    expect(prisma.housekeepingTask.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 9,
        },
      }),
    );
    expect(prisma.housekeepingTask.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          taskNumber: 'HKT-20260602-123450',
        },
      }),
    );
  });

  it('lists tasks with filters, search, pagination, and stable ordering', async () => {
    prisma.housekeepingTask.count.mockResolvedValue(0);
    prisma.housekeepingTask.findMany.mockResolvedValue([]);

    await repository.listTasks({
      skip: 10,
      take: 5,
      search: '101',
      status: HousekeepingTaskStatus.PENDING,
      type: HousekeepingTaskType.CHECKOUT_CLEANING,
      priority: HousekeepingPriority.URGENT,
      roomId: 12,
      assignedToUserId: 7,
      createdFrom: new Date('2026-06-01'),
      createdTo: new Date('2026-06-02'),
    });

