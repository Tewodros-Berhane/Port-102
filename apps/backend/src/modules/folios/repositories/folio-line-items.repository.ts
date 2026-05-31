import { Injectable } from '@nestjs/common';

import { FolioLineItemType, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const folioLineItemSelect = {
  id: true,
  folioId: true,
  type: true,
  description: true,
  quantity: true,
  unitAmount: true,
  totalAmount: true,
  isVoided: true,
  voidReason: true,
  sourceType: true,
  sourceId: true,
  postedByUserId: true,
  postedAt: true,
  createdAt: true,
  updatedAt: true,
  postedBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} as const;

export type FolioLineItemRecord = Prisma.FolioLineItemGetPayload<{
  select: typeof folioLineItemSelect;
}>;

type FolioLineItemClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'folioLineItem'
>;

@Injectable()
export class FolioLineItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createLineItem(
    data: Prisma.FolioLineItemUncheckedCreateInput,
    client: FolioLineItemClient = this.prisma,
  ) {
    return client.folioLineItem.create({
      data,
      select: folioLineItemSelect,
    });
  }

  findLineItem(lineItemId: number, client: FolioLineItemClient = this.prisma) {
    return client.folioLineItem.findUnique({
      where: {
        id: lineItemId,
      },
      select: folioLineItemSelect,
    });
  }

  listLineItems({
    folioId,
    type,
    includeVoided = true,
    client = this.prisma,
  }: {
    folioId: number;
    type?: FolioLineItemType;
    includeVoided?: boolean;
    client?: FolioLineItemClient;
  }) {
    return client.folioLineItem.findMany({
      where: {
        folioId,
        ...(type ? { type } : {}),
        ...(includeVoided ? {} : { isVoided: false }),
      },
      select: folioLineItemSelect,
      orderBy: [{ postedAt: 'asc' }, { id: 'asc' }],
    });
  }

  updateLineItem(
    lineItemId: number,
    data: Prisma.FolioLineItemUncheckedUpdateInput,
    client: FolioLineItemClient = this.prisma,
  ) {
    return client.folioLineItem.update({
      where: {
        id: lineItemId,
      },
      data,
      select: folioLineItemSelect,
    });
  }
}
