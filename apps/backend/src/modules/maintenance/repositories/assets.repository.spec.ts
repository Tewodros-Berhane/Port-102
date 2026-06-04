import { Test, TestingModule } from '@nestjs/testing';

import { AssetStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AssetsRepository } from './assets.repository';

describe('AssetsRepository', () => {
  let repository: AssetsRepository;
  let prisma: {
    asset: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      asset: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
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
