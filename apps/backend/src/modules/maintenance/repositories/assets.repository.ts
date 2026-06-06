import { Injectable } from '@nestjs/common';

import {
  AssetStatus,
  MaintenanceTicketStatus,
  Prisma,
} from '../../../generated/prisma/client';
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

  createAsset(
    data: Prisma.AssetUncheckedCreateInput,
    client: AssetClient = this.prisma,
  ) {
    return client.asset.create({
      data,
      select: assetSelect,
    });
  }

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

  findByAssetNumber(
    assetNumber: string,
    excludeAssetId?: number,
    client: AssetClient = this.prisma,
  ) {
    return client.asset.findFirst({
      where: {
        assetNumber,
        ...(excludeAssetId ? { id: { not: excludeAssetId } } : {}),
      },
      select: assetSelect,
    });
  }

  listAssets({
    skip,
    take,
    search,
    status,
    category,
    roomId,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: AssetStatus;
    category?: string;
    roomId?: number;
  }) {
    const where: Prisma.AssetWhereInput = {
      ...(status ? { status } : {}),
      ...(category
        ? {
            category: {
              equals: category,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(roomId === undefined ? {} : { roomId }),
      ...(search
        ? {
            OR: [
              {
                assetNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                category: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                location: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                room: {
                  OR: [
                    {
                      roomNumber: {
                        contains: search,
                        mode: 'insensitive',
                      },
                    },
                    {
                      displayName: {
                        contains: search,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        skip,
        take,
        select: assetSelect,
        orderBy: [{ assetNumber: 'asc' }, { id: 'asc' }],
      }),
    ]);
  }

  updateAsset(
    assetId: number,
    data: Prisma.AssetUncheckedUpdateInput,
    client: AssetClient = this.prisma,
  ) {
    return client.asset.update({
      where: {
        id: assetId,
      },
      data,
      select: assetSelect,
    });
  }

  countActiveTickets(assetId: number) {
    return this.prisma.maintenanceTicket.count({
      where: {
        assetId,
        status: {
          notIn: [
            MaintenanceTicketStatus.APPROVED,
            MaintenanceTicketStatus.CANCELLED,
          ],
        },
      },
    });
  }

  countAssets(where: Prisma.AssetWhereInput) {
    return this.prisma.asset.count({ where });
  }
}
