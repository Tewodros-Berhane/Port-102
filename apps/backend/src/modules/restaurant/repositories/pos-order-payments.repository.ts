import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const posOrderPaymentSelect = {
  id: true,
  paymentNumber: true,
  orderId: true,
  amount: true,
  method: true,
  reference: true,
  notes: true,
  recordedByUserId: true,
  recordedAt: true,
  isVoided: true,
  voidReason: true,
  voidedAt: true,
  createdAt: true,
  updatedAt: true,
  recordedBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} as const;

export type PosOrderPaymentRecord = Prisma.PosOrderPaymentGetPayload<{
  select: typeof posOrderPaymentSelect;
}>;

type PosOrderPaymentClient = Pick<
  PrismaService | Prisma.TransactionClient,
  'posOrderPayment'
>;

@Injectable()
export class PosOrderPaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createPayment(
    data: Prisma.PosOrderPaymentUncheckedCreateInput,
    client: PosOrderPaymentClient = this.prisma,
  ) {
    return client.posOrderPayment.create({
      data,
      select: posOrderPaymentSelect,
    });
  }

  findByPaymentNumber(paymentNumber: string) {
    return this.prisma.posOrderPayment.findUnique({
      where: {
        paymentNumber,
      },
      select: posOrderPaymentSelect,
    });
  }
}
