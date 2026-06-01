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
