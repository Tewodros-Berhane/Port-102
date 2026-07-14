import { Injectable } from '@nestjs/common';

import {
  GoodsReceivedStatus,
  InventoryItemStatus,
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  SupplierStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SupplyChainReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  listInventoryItems(locationId?: number) {
    return this.prisma.inventoryItem.findMany({
      where: { status: InventoryItemStatus.ACTIVE },
      select: {
        id: true,
        itemNumber: true,
        name: true,
        type: true,
        status: true,
        reorderLevel: true,
        averageCost: true,
        balances: {
          where: locationId ? { locationId } : undefined,
          select: {
            quantity: true,
            location: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { itemNumber: 'asc' },
    });
  }

  countActiveItems() {
    return this.prisma.inventoryItem.count({
      where: { status: InventoryItemStatus.ACTIVE },
    });
  }

  listMovements(from: Date, to: Date, locationId?: number) {
    return this.prisma.stockMovement.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        ...(locationId
          ? {
              OR: [
                { locationId },
                { fromLocationId: locationId },
                { toLocationId: locationId },
              ],
            }
          : {}),
      },
      select: { itemId: true, type: true, quantity: true, createdAt: true },
    });
  }

  listPurchaseRequests(from: Date, to: Date) {
    return this.prisma.purchaseRequest.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { id: true, status: true, createdAt: true },
    });
  }

  listPurchaseOrders(from: Date, to: Date) {
    return this.prisma.purchaseOrder.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        expectedAt: true,
        createdAt: true,
        items: {
          select: { quantity: true, unitCost: true, receivedQuantity: true },
        },
      },
    });
  }

  listGoodsReceived(from: Date, to: Date) {
    return this.prisma.goodsReceived.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        id: true,
        grnNumber: true,
        status: true,
        createdAt: true,
        items: { select: { quantity: true, unitCost: true } },
      },
    });
  }

  countActiveSuppliers() {
    return this.prisma.supplier.count({
      where: { status: SupplierStatus.ACTIVE },
    });
  }

  listDraftGoodsReceivedBefore(cutoff: Date) {
    return this.prisma.goodsReceived.findMany({
      where: { status: GoodsReceivedStatus.DRAFT, createdAt: { lt: cutoff } },
      select: {
        id: true,
        grnNumber: true,
        createdAt: true,
        purchaseOrderId: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  listPendingPurchaseRequests() {
    return this.prisma.purchaseRequest.findMany({
      where: { status: PurchaseRequestStatus.SUBMITTED },
      select: { id: true, requestNumber: true, createdAt: true, reason: true },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  listOverduePurchaseOrders(now: Date) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        expectedAt: { lt: now },
        status: {
          in: [
            PurchaseOrderStatus.ORDERED,
            PurchaseOrderStatus.PARTIALLY_RECEIVED,
          ],
        },
      },
      select: { id: true, orderNumber: true, status: true, expectedAt: true },
      orderBy: { expectedAt: 'asc' },
      take: 100,
    });
  }
}
