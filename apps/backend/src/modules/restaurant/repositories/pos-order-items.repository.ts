import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const posOrderItemSelect = {
  id: true,
  orderId: true,
  menuItemId: true,
  description: true,
  quantity: true,
  unitPrice: true,
  totalAmount: true,
  notes: true,
  isVoided: true,
  voidReason: true,
  createdAt: true,
  updatedAt: true,
  menuItem: {
    select: {
      id: true,
      name: true,
      code: true,
      category: true,
      status: true,
    },
  },
} as const;

export type PosOrderItemRecord = Prisma.PosOrderItemGetPayload<{
  select: typeof posOrderItemSelect;
}>;

type PosOrderItemClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'posOrderItem'
>;

@Injectable()
export class PosOrderItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createOrderItem(
    data: Prisma.PosOrderItemUncheckedCreateInput,
    client: PosOrderItemClient = this.prisma,
  ) {
    return client.posOrderItem.create({
      data,
      select: posOrderItemSelect,
    });
  }

  findOrderItem(
    orderId: number,
    itemId: number,
    client: PosOrderItemClient = this.prisma,
  ) {
    return client.posOrderItem.findFirst({
      where: {
        id: itemId,
        orderId,
      },
      select: posOrderItemSelect,
    });
  }

  updateOrderItem(
    itemId: number,
    data: Prisma.PosOrderItemUncheckedUpdateInput,
    client: PosOrderItemClient = this.prisma,
  ) {
    return client.posOrderItem.update({
      where: {
        id: itemId,
      },
      data,
      select: posOrderItemSelect,
    });
  }
}
