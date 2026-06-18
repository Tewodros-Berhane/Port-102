import { Injectable } from '@nestjs/common';

import {
  GoodsReceivedStatus,
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  SupplierStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ProcurementReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getDashboardCounts() {
    return Promise.all([
      this.prisma.purchaseRequest.count({
        where: { status: PurchaseRequestStatus.SUBMITTED },
      }),
      this.prisma.purchaseRequest.count({
        where: { status: PurchaseRequestStatus.APPROVED },
      }),
      this.prisma.purchaseOrder.count({
        where: {
          status: {
            in: [
              PurchaseOrderStatus.DRAFT,
              PurchaseOrderStatus.SUBMITTED,
              PurchaseOrderStatus.APPROVED,
              PurchaseOrderStatus.ORDERED,
            ],
          },
        },
      }),
      this.prisma.purchaseOrder.count({
        where: { status: PurchaseOrderStatus.PARTIALLY_RECEIVED },
      }),
      this.prisma.purchaseOrder.count({
        where: { status: PurchaseOrderStatus.RECEIVED },
      }),
      this.prisma.supplier.count({
        where: { status: SupplierStatus.ACTIVE },
      }),
      this.prisma.goodsReceived.count({
        where: { status: GoodsReceivedStatus.DRAFT },
      }),
    ]);
  }
}
