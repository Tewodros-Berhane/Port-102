import { Test, TestingModule } from '@nestjs/testing';

import { HousekeepingIssueStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { HousekeepingIssuesRepository } from './housekeeping-issues.repository';

describe('HousekeepingIssuesRepository', () => {
  let repository: HousekeepingIssuesRepository;
  let prisma: {
    housekeepingIssue: {
      create: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      housekeepingIssue: {
        create: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HousekeepingIssuesRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<HousekeepingIssuesRepository>(
      HousekeepingIssuesRepository,
    );
  });

  it('creates issues through PrismaService', async () => {
    await repository.createIssue({
      issueNumber: 'HKI-20260602-123450',
      roomId: 12,
      reportedByUserId: 1,
      status: HousekeepingIssueStatus.OPEN,
      title: 'Broken lamp',
    });

    expect(prisma.housekeepingIssue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          issueNumber: 'HKI-20260602-123450',
          roomId: 12,
          reportedByUserId: 1,
          status: HousekeepingIssueStatus.OPEN,
          title: 'Broken lamp',
        },
      }),
    );
  });

  it('finds issues by id and issue number', async () => {
    await repository.findIssue(9);
    await repository.findByIssueNumber('HKI-20260602-123450');

    expect(prisma.housekeepingIssue.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 9,
        },
      }),
    );
    expect(prisma.housekeepingIssue.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          issueNumber: 'HKI-20260602-123450',
        },
      }),
    );
  });

  it('lists issues with filters, search, pagination, and stable ordering', async () => {
    prisma.housekeepingIssue.count.mockResolvedValue(0);
    prisma.housekeepingIssue.findMany.mockResolvedValue([]);

    await repository.listIssues({
      skip: 10,
      take: 5,
      search: 'lamp',
      status: HousekeepingIssueStatus.OPEN,
      roomId: 12,
      taskId: 9,
      reportedByUserId: 1,
      createdFrom: new Date('2026-06-01'),
      createdTo: new Date('2026-06-02'),
    });

    expect(prisma.housekeepingIssue.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: HousekeepingIssueStatus.OPEN,
        roomId: 12,
        taskId: 9,
        reportedByUserId: 1,
        createdAt: {
          gte: expect.any(Date),
          lte: expect.any(Date),
        },
        OR: expect.any(Array),
      }),
    });
    expect(prisma.housekeepingIssue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 5,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('counts issues for dashboard summaries', async () => {
    await repository.countIssues({
      status: HousekeepingIssueStatus.OPEN,
    });

    expect(prisma.housekeepingIssue.count).toHaveBeenCalledWith({
      where: {
        status: HousekeepingIssueStatus.OPEN,
      },
    });
  });

  it('updates issues by id', async () => {
    await repository.updateIssue(15, {
      status: HousekeepingIssueStatus.RESOLVED,
      resolutionNotes: 'Fixed.',
    });

    expect(prisma.housekeepingIssue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 15,
        },
        data: {
          status: HousekeepingIssueStatus.RESOLVED,
          resolutionNotes: 'Fixed.',
        },
      }),
    );
  });
});
