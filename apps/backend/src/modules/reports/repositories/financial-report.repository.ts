import { Injectable } from '@nestjs/common';

import {
  FolioStatus,
  PaymentMethod,
  PaymentStatus,
  PosOrderStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FinancialReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  listFolioLineItems(from: Date, to: Date) {
    return this.prisma.folioLineItem.findMany({
      where: { postedAt: { gte: from, lte: to }, isVoided: false },
      select: {
        id: true,
        type: true,
        totalAmount: true,
        postedAt: true,
        sourceType: true,
      },
      orderBy: { postedAt: 'asc' },
    });
  }

  listFolioPayments(from: Date, to: Date, method?: PaymentMethod) {
    return this.prisma.payment.findMany({
      where: {
        recordedAt: { gte: from, lte: to },
        ...(method ? { method } : {}),
      },
      select: {
        id: true,
        amount: true,
        method: true,
        status: true,
        recordedAt: true,
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  listPosPayments(from: Date, to: Date) {
    return this.prisma.posOrderPayment.findMany({
      where: { recordedAt: { gte: from, lte: to } },
      select: {
        id: true,
        orderId: true,
        amount: true,
        method: true,
        isVoided: true,
        recordedAt: true,
        order: { select: { outletId: true, status: true } },
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  listPosOrders(from: Date, to: Date, outletId?: number) {
    return this.prisma.posOrder.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        ...(outletId ? { outletId } : {}),
      },
      select: {
        id: true,
        orderNumber: true,
        outletId: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
        outlet: { select: { code: true, name: true } },
        items: {
          where: { isVoided: false },
          select: {
            quantity: true,
            totalAmount: true,
            menuItem: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  outstandingFolioBalance() {
    return this.prisma.folio.aggregate({
      where: { status: FolioStatus.OPEN },
      _sum: { balanceAmount: true },
    });
  }

  listUnpaidOpenFolios() {
    return this.prisma.folio.findMany({
      where: { status: FolioStatus.OPEN, balanceAmount: { gt: 0 } },
      select: {
        id: true,
        folioNumber: true,
        balanceAmount: true,
        stay: { select: { id: true, stayNumber: true } },
        guest: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { balanceAmount: 'desc' },
      take: 100,
    });
  }

  countVoidedPayments(from: Date, to: Date) {
    return this.prisma.payment.aggregate({
      where: {
        status: PaymentStatus.VOIDED,
        recordedAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
    });
  }

  countCancelledPosOrders(from: Date, to: Date) {
    return this.prisma.posOrder.count({
      where: {
        status: PosOrderStatus.CANCELLED,
        createdAt: { gte: from, lte: to },
      },
    });
  }
}
