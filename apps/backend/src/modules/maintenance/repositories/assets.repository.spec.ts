import { Test, TestingModule } from '@nestjs/testing';

import {
  AssetStatus,
  MaintenanceTicketStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AssetsRepository } from './assets.repository';

describe('AssetsRepository', () => {
  let repository: AssetsRepository;
  let prisma: {
    asset: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    maintenanceTicket: {
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      asset: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      maintenanceTicket: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<AssetsRepository>(AssetsRepository);
  });

  it('finds assets by id', async () => {
    await repository.findAsset(4);

    expect(prisma.asset.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 4,
        },
      }),
    );
  });

  it('creates assets through PrismaService', async () => {
    await repository.createAsset({
      assetNumber: 'AST-0004',
      name: 'Room 204 AC',
      status: AssetStatus.ACTIVE,
    });

    expect(prisma.asset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          assetNumber: 'AST-0004',
          name: 'Room 204 AC',
          status: AssetStatus.ACTIVE,
        },
      }),
    );
  });

  it('finds only active assets for ticket linking', async () => {
    await repository.findActiveAsset(4);

    expect(prisma.asset.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 4,
          status: AssetStatus.ACTIVE,
        },
      }),
    );
  });

  it('finds assets by unique asset number with an optional exclusion', async () => {
    await repository.findByAssetNumber('AST-0004', 4);

    expect(prisma.asset.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          assetNumber: 'AST-0004',
          id: {
            not: 4,
          },
        },
      }),
    );
  });

  it('lists assets with pagination and filters', async () => {
    prisma.asset.count.mockResolvedValue(0);
    prisma.asset.findMany.mockResolvedValue([]);

    await repository.listAssets({
      skip: 10,
      take: 10,
      search: 'AC',
      status: AssetStatus.ACTIVE,
      category: 'HVAC',
      roomId: 12,
    });

    expect(prisma.asset.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: AssetStatus.ACTIVE,
        roomId: 12,
        category: {
          equals: 'HVAC',
          mode: 'insensitive',
        },
        OR: expect.any(Array),
      }),
    });
    expect(prisma.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: [{ assetNumber: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('updates assets through PrismaService', async () => {
    await repository.updateAsset(4, {
      status: AssetStatus.INACTIVE,
    });

    expect(prisma.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 4,
        },
        data: {
          status: AssetStatus.INACTIVE,
        },
      }),
    );
  });

  it('counts non-terminal tickets linked to an asset', async () => {
    await repository.countActiveTickets(4);

    expect(prisma.maintenanceTicket.count).toHaveBeenCalledWith({
      where: {
        assetId: 4,
        status: {
          notIn: [
            MaintenanceTicketStatus.APPROVED,
            MaintenanceTicketStatus.CANCELLED,
          ],
        },
      },
    });
  });

  it('counts assets for dashboard summaries', async () => {
    await repository.countAssets({
      status: AssetStatus.UNDER_MAINTENANCE,
    });

    expect(prisma.asset.count).toHaveBeenCalledWith({
      where: {
        status: AssetStatus.UNDER_MAINTENANCE,
      },
    });
  });
});
