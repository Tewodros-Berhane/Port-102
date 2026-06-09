import { Injectable } from '@nestjs/common';

import {
  FolioLineItemType,
  Prisma,
  StayRoomAssignmentStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const stayForRoomChargeSelect = {
  id: true,
  stayNumber: true,
  status: true,
  folio: {
    select: {
      id: true,
      folioNumber: true,
      status: true,
      subtotalAmount: true,
      totalAmount: true,
      balanceAmount: true,
    },
  },
  roomAssignments: {
    where: {
      status: StayRoomAssignmentStatus.ACTIVE,
    },
    select: {
      id: true,
      roomId: true,
      room: {
        select: {
          id: true,
          roomNumber: true,
        },
      },
    },
    orderBy: {
      assignedAt: 'desc',
    },
    take: 1,
  },
} as const;

const folioLineItemSelect = {
  id: true,
  folioId: true,
  type: true,
  description: true,
  quantity: true,
  unitAmount: true,
  totalAmount: true,
  sourceType: true,
  sourceId: true,
  postedByUserId: true,
  postedAt: true,
} as const;

const folioSummarySelect = {
  id: true,
  folioNumber: true,
  status: true,
  subtotalAmount: true,
  totalAmount: true,
  paidAmount: true,
  balanceAmount: true,
} as const;

export type StayForRoomChargeRecord = Prisma.StayGetPayload<{
  select: typeof stayForRoomChargeSelect;
}>;

export type PosRoomChargeRecord = Prisma.FolioLineItemGetPayload<{
  select: typeof folioLineItemSelect;
}>;

type RoomChargeClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'stay' | 'folio' | 'folioLineItem'
>;

@Injectable()
export class PosRoomChargesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findStay(
    stayId: number,
    client: RoomChargeClient = this.prisma,
  ): Promise<StayForRoomChargeRecord | null> {
    return client.stay.findUnique({
      where: { id: stayId },
      select: stayForRoomChargeSelect,
    });
  }

  findOrderCharge(orderId: number, client: RoomChargeClient = this.prisma) {
    return client.folioLineItem.findFirst({
      where: {
        type: FolioLineItemType.POS_CHARGE,
        sourceType: 'POS_ORDER',
        sourceId: orderId,
        isVoided: false,
      },
      select: folioLineItemSelect,
    });
  }

  createCharge(
    data: Prisma.FolioLineItemUncheckedCreateInput,
    client: RoomChargeClient = this.prisma,
  ) {
    return client.folioLineItem.create({
      data,
      select: folioLineItemSelect,
    });
  }

  incrementFolio(
    folioId: number,
    amount: Prisma.Decimal,
    client: RoomChargeClient = this.prisma,
  ) {
    return client.folio.update({
      where: { id: folioId },
      data: {
        subtotalAmount: { increment: amount },
        totalAmount: { increment: amount },
        balanceAmount: { increment: amount },
      },
      select: folioSummarySelect,
    });
  }
}
