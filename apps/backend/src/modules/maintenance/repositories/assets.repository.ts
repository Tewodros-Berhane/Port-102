import { Injectable } from '@nestjs/common';

import { AssetStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const assetSelect = {
  id: true,
  assetNumber: true,
  name: true,
  category: true,
  location: true,
  roomId: true,
  status: true,
  description: true,
  purchaseDate: true,
  warrantyUntil: true,
  createdAt: true,
  updatedAt: true,
  room: {
    select: {
      id: true,
      roomNumber: true,
      displayName: true,
      maintenanceStatus: true,
      isActive: true,
    },
  },
} as const;

export type AssetRecord = Prisma.AssetGetPayload<{
  select: typeof assetSelect;
}>;

type AssetClient = Pick<PrismaService | Prisma.TransactionClient, 'asset'>;

@Injectable()
export class AssetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAsset(assetId: number, client: AssetClient = this.prisma) {
    return client.asset.findUnique({
      where: {
        id: assetId,
      },
      select: assetSelect,
    });
  }

  findActiveAsset(assetId: number, client: AssetClient = this.prisma) {
    return client.asset.findFirst({
      where: {
        id: assetId,
        status: AssetStatus.ACTIVE,
      },
      select: assetSelect,
    });
  }
}
