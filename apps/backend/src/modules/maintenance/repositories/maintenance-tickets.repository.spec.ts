import { Test, TestingModule } from '@nestjs/testing';

import {
  MaintenanceIssueType,
  MaintenancePriority,
  MaintenanceTicketSource,
  MaintenanceTicketStatus,
  UserStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { MaintenanceTicketsRepository } from './maintenance-tickets.repository';

describe('MaintenanceTicketsRepository', () => {
  let repository: MaintenanceTicketsRepository;
  let prisma: {
    $transaction: jest.Mock;
    maintenanceTicket: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
    user: {
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((callback) => callback({ tx: true })),
      maintenanceTicket: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceTicketsRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<MaintenanceTicketsRepository>(
      MaintenanceTicketsRepository,
    );
  });

  it('creates tickets through PrismaService', async () => {
    await repository.createTicket({
      ticketNumber: 'MNT-20260604-123450',
      title: 'AC leaking',
      source: MaintenanceTicketSource.MANUAL,
      status: MaintenanceTicketStatus.OPEN,
      priority: MaintenancePriority.NORMAL,
      issueType: MaintenanceIssueType.HVAC,
      reportedByUserId: 1,
    });

    expect(prisma.maintenanceTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          ticketNumber: 'MNT-20260604-123450',
          title: 'AC leaking',
          source: MaintenanceTicketSource.MANUAL,
          status: MaintenanceTicketStatus.OPEN,
          priority: MaintenancePriority.NORMAL,
          issueType: MaintenanceIssueType.HVAC,
          reportedByUserId: 1,
        },
      }),
    );
  });

  it('runs callbacks in a Prisma transaction', async () => {
    const callback = jest.fn().mockResolvedValue('done');

    await expect(repository.runInTransaction(callback)).resolves.toBe('done');
    expect(prisma.$transaction).toHaveBeenCalledWith(callback);
    expect(callback).toHaveBeenCalledWith({ tx: true });
  });

  it('finds tickets by id and ticket number', async () => {
    await repository.findTicket(30);
    await repository.findByTicketNumber('MNT-20260604-123450');

    expect(prisma.maintenanceTicket.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 30,
        },
        select: expect.objectContaining({
          notes: expect.any(Object),
          photos: expect.any(Object),
        }),
      }),
    );
    expect(prisma.maintenanceTicket.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ticketNumber: 'MNT-20260604-123450',
        },
      }),
    );
  });

  it('updates tickets through PrismaService', async () => {
    await repository.updateTicket(30, {
      assignedToUserId: 9,
      assignedByUserId: 1,
      status: MaintenanceTicketStatus.ASSIGNED,
    });

    expect(prisma.maintenanceTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 30,
        },
        data: {
          assignedToUserId: 9,
          assignedByUserId: 1,
          status: MaintenanceTicketStatus.ASSIGNED,
        },
      }),
    );
  });

  it('lists tickets with filters, pagination, and stable ordering', async () => {
    prisma.maintenanceTicket.count.mockResolvedValue(0);
    prisma.maintenanceTicket.findMany.mockResolvedValue([]);

    await repository.listTickets({
      skip: 10,
      take: 10,
      search: 'AC',
      status: MaintenanceTicketStatus.OPEN,
      priority: MaintenancePriority.URGENT,
      issueType: MaintenanceIssueType.HVAC,
      roomId: 12,
      assetId: 4,
      assignedToUserId: 9,
      createdFrom: new Date('2026-06-01'),
      createdTo: new Date('2026-06-30'),
    });

    expect(prisma.maintenanceTicket.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: MaintenanceTicketStatus.OPEN,
        priority: MaintenancePriority.URGENT,
        issueType: MaintenanceIssueType.HVAC,
        roomId: 12,
        assetId: 4,
        assignedToUserId: 9,
        createdAt: {
          gte: new Date('2026-06-01'),
          lte: new Date('2026-06-30'),
        },
        OR: expect.any(Array),
      }),
    });
    expect(prisma.maintenanceTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('finds active users for assignment', async () => {
    await repository.findActiveUser(9);

    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 9,
          status: UserStatus.ACTIVE,
        },
      }),
    );
  });
});
