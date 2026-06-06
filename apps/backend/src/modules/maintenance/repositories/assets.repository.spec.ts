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
});
