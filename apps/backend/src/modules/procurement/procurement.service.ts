import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  GoodsReceivedStatus,
  Prisma,
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  SupplierStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { ApprovePurchaseOrderDto } from './dto/approve-purchase-order.dto';
import { ApprovePurchaseRequestDto } from './dto/approve-purchase-request.dto';
import { CancelGoodsReceivedDto } from './dto/cancel-goods-received.dto';
import { CancelPurchaseOrderDto } from './dto/cancel-purchase-order.dto';
import { CancelPurchaseRequestDto } from './dto/cancel-purchase-request.dto';
import { CreateGoodsReceivedDto } from './dto/create-goods-received.dto';
import { CreatePurchaseOrderFromRequestDto } from './dto/create-purchase-order-from-request.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { GetGoodsReceivedQueryDto } from './dto/get-goods-received-query.dto';
import { GetPurchaseOrdersQueryDto } from './dto/get-purchase-orders-query.dto';
import { GetPurchaseRequestsQueryDto } from './dto/get-purchase-requests-query.dto';
import { GetSuppliersQueryDto } from './dto/get-suppliers-query.dto';
import { MarkPurchaseOrderOrderedDto } from './dto/mark-purchase-order-ordered.dto';
import { PostGoodsReceivedDto } from './dto/post-goods-received.dto';
import { ProcurementDashboardQueryDto } from './dto/procurement-dashboard-query.dto';
import { PurchaseOrderItemDto } from './dto/purchase-order-item.dto';
import { PurchaseRequestItemDto } from './dto/purchase-request-item.dto';
import { RejectPurchaseRequestDto } from './dto/reject-purchase-request.dto';
import { SubmitPurchaseRequestDto } from './dto/submit-purchase-request.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import {
  GoodsReceivedRecord,
  GoodsReceivedRepository,
} from './repositories/goods-received.repository';
import { ProcurementReportsRepository } from './repositories/procurement-reports.repository';
import {
  PurchaseOrderRecord,
  PurchaseOrdersRepository,
} from './repositories/purchase-orders.repository';
import {
  PurchaseRequestRecord,
  PurchaseRequestsRepository,
} from './repositories/purchase-requests.repository';
import {
  SupplierRecord,
  SuppliersRepository,
} from './repositories/suppliers.repository';

@Injectable()
export class ProcurementService {
  constructor(
    private readonly suppliersRepository: SuppliersRepository,
    private readonly purchaseRequestsRepository: PurchaseRequestsRepository,
    private readonly purchaseOrdersRepository: PurchaseOrdersRepository,
    private readonly goodsReceivedRepository: GoodsReceivedRepository,
    private readonly procurementReportsRepository: ProcurementReportsRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async createPurchaseRequest(
    currentUser: CurrentUserPayload,
    dto: CreatePurchaseRequestDto,
  ) {
    await this.assertActiveItems(dto.items, this.purchaseRequestsRepository);
    const requestNumber = await this.generateRequestNumber();
    const request = await this.purchaseRequestsRepository.createRequest({
      requestNumber,
      departmentId: dto.departmentId,
      requestedByUserId: currentUser.sub,
      reason: this.normalizeOptionalString(dto.reason),
      notes: this.normalizeOptionalString(dto.notes),
      items: this.toRequestItems(dto.items),
    });

    await this.recordAudit(
      currentUser,
      'procurement.purchase_requests.created',
      {
        entityType: 'PurchaseRequest',
        entityId: request.id,
        metadata: this.purchaseRequestAuditSnapshot(request),
      },
    );

    return this.serializePurchaseRequest(request);
  }

  async listPurchaseRequests(
    _currentUser: CurrentUserPayload,
    query: GetPurchaseRequestsQueryDto,
  ) {
    const { page, limit, createdFrom, createdTo } = this.parseListQuery(query);
    const [total, requests] =
      await this.purchaseRequestsRepository.listRequests({
        skip: (page - 1) * limit,
        take: limit,
        search: this.normalizeOptionalString(query.search) ?? undefined,
        status: query.status,
        departmentId: query.departmentId,
        createdFrom,
        createdTo,
      });

    return this.paginate(
      requests.map((request) => this.serializePurchaseRequest(request)),
      total,
      page,
      limit,
    );
  }

  async getPurchaseRequestById(
    _currentUser: CurrentUserPayload,
    requestId: number,
  ) {
    return this.serializePurchaseRequest(
      await this.findRequiredPurchaseRequest(requestId),
    );
  }

  async updatePurchaseRequest(
    currentUser: CurrentUserPayload,
    requestId: number,
    dto: UpdatePurchaseRequestDto,
  ) {
    const request = await this.findRequiredPurchaseRequest(requestId);

    if (request.status !== PurchaseRequestStatus.DRAFT) {
      throw new ConflictException(
        'Only draft purchase requests can be updated.',
      );
    }

    const data: Prisma.PurchaseRequestUncheckedUpdateInput = {};

    if (dto.departmentId !== undefined) {
      data.departmentId = dto.departmentId;
    }

    if (dto.reason !== undefined) {
      data.reason = this.normalizeOptionalString(dto.reason);
    }

    if (dto.notes !== undefined) {
      data.notes = this.normalizeOptionalString(dto.notes);
    }

    const items = dto.items ? this.toRequestItems(dto.items) : undefined;

    if (dto.items) {
      await this.assertActiveItems(dto.items, this.purchaseRequestsRepository);
    }

    if (Object.keys(data).length === 0 && !items) {
      return this.serializePurchaseRequest(request);
    }

    const updated = await this.purchaseRequestsRepository.updateRequest(
      request.id,
      data,
      items,
    );

    await this.recordAudit(
      currentUser,
      'procurement.purchase_requests.updated',
      {
        entityType: 'PurchaseRequest',
        entityId: updated.id,
        metadata: {
          previous: this.purchaseRequestAuditSnapshot(request),
          current: this.purchaseRequestAuditSnapshot(updated),
        },
      },
    );

    return this.serializePurchaseRequest(updated);
  }

  async submitPurchaseRequest(
    currentUser: CurrentUserPayload,
    requestId: number,
    dto: SubmitPurchaseRequestDto,
  ) {
    const request = await this.findRequiredPurchaseRequest(requestId);

    if (request.status !== PurchaseRequestStatus.DRAFT) {
      throw new ConflictException(
        'Only draft purchase requests can be submitted.',
      );
    }

    const submitted = await this.purchaseRequestsRepository.updateRequest(
      request.id,
      {
        status: PurchaseRequestStatus.SUBMITTED,
        submittedAt: new Date(),
        notes: dto.notes
          ? this.normalizeOptionalString(dto.notes)
          : request.notes,
      },
    );

    await this.recordAudit(
      currentUser,
      'procurement.purchase_requests.submitted',
      {
        entityType: 'PurchaseRequest',
        entityId: submitted.id,
        metadata: this.purchaseRequestAuditSnapshot(submitted),
      },
    );

    return this.serializePurchaseRequest(submitted);
  }

  async approvePurchaseRequest(
    currentUser: CurrentUserPayload,
    requestId: number,
    dto: ApprovePurchaseRequestDto,
  ) {
    const request = await this.findRequiredPurchaseRequest(requestId);
    this.assertSubmittedRequest(request);

    const approved = await this.purchaseRequestsRepository.updateRequest(
      request.id,
      {
        status: PurchaseRequestStatus.APPROVED,
        approvedByUserId: currentUser.sub,
        rejectedByUserId: null,
        decidedAt: new Date(),
        decisionNote: this.normalizeOptionalString(dto.decisionNote),
      },
    );

    await this.recordAudit(
      currentUser,
      'procurement.purchase_requests.approved',
      {
        entityType: 'PurchaseRequest',
        entityId: approved.id,
        metadata: this.purchaseRequestAuditSnapshot(approved),
      },
    );

    return this.serializePurchaseRequest(approved);
  }

  async rejectPurchaseRequest(
    currentUser: CurrentUserPayload,
    requestId: number,
    dto: RejectPurchaseRequestDto,
  ) {
    const request = await this.findRequiredPurchaseRequest(requestId);
    this.assertSubmittedRequest(request);

    const rejected = await this.purchaseRequestsRepository.updateRequest(
      request.id,
      {
        status: PurchaseRequestStatus.REJECTED,
        rejectedByUserId: currentUser.sub,
        approvedByUserId: null,
        decidedAt: new Date(),
        decisionNote: this.normalizeRequiredString(
          dto.decisionNote,
          'Purchase request rejection reason is required.',
        ),
      },
    );

    await this.recordAudit(
      currentUser,
      'procurement.purchase_requests.rejected',
      {
        entityType: 'PurchaseRequest',
        entityId: rejected.id,
        metadata: this.purchaseRequestAuditSnapshot(rejected),
      },
    );

    return this.serializePurchaseRequest(rejected);
  }

  async cancelPurchaseRequest(
    currentUser: CurrentUserPayload,
    requestId: number,
    dto: CancelPurchaseRequestDto,
  ) {
    const request = await this.findRequiredPurchaseRequest(requestId);

    if (
      request.status !== PurchaseRequestStatus.DRAFT &&
      request.status !== PurchaseRequestStatus.SUBMITTED &&
      request.status !== PurchaseRequestStatus.APPROVED
    ) {
      throw new ConflictException('This purchase request cannot be cancelled.');
    }

    const cancelled = await this.purchaseRequestsRepository.updateRequest(
      request.id,
      {
        status: PurchaseRequestStatus.CANCELLED,
        rejectedByUserId: currentUser.sub,
        decidedAt: new Date(),
        decisionNote: this.normalizeRequiredString(
          dto.decisionNote,
          'Purchase request cancellation reason is required.',
        ),
      },
    );

    await this.recordAudit(
      currentUser,
      'procurement.purchase_requests.cancelled',
      {
        entityType: 'PurchaseRequest',
        entityId: cancelled.id,
        metadata: this.purchaseRequestAuditSnapshot(cancelled),
      },
    );

    return this.serializePurchaseRequest(cancelled);
  }

  async createPurchaseOrder(
    currentUser: CurrentUserPayload,
    dto: CreatePurchaseOrderDto,
  ) {
    await this.assertActiveSupplier(dto.supplierId);
    await this.assertActiveItems(dto.items, this.purchaseOrdersRepository);
    const orderNumber = await this.generateOrderNumber();
    const order = await this.purchaseOrdersRepository.createOrder({
      orderNumber,
      supplierId: dto.supplierId,
      purchaseRequestId: dto.purchaseRequestId,
      createdByUserId: currentUser.sub,
      expectedAt: this.parseOptionalDate(dto.expectedAt),
      notes: this.normalizeOptionalString(dto.notes),
      items: this.toOrderItems(dto.items),
    });

    await this.recordAudit(currentUser, 'procurement.purchase_orders.created', {
      entityType: 'PurchaseOrder',
      entityId: order.id,
      metadata: this.purchaseOrderAuditSnapshot(order),
    });

    return this.serializePurchaseOrder(order);
  }

  async createPurchaseOrderFromRequest(
    currentUser: CurrentUserPayload,
    requestId: number,
    dto: CreatePurchaseOrderFromRequestDto,
  ) {
    const request = await this.findRequiredPurchaseRequest(requestId);

    if (request.status !== PurchaseRequestStatus.APPROVED) {
      throw new ConflictException(
        'Only approved purchase requests can be converted to purchase orders.',
      );
    }

    await this.assertActiveSupplier(dto.supplierId);
    const orderNumber = await this.generateOrderNumber();
    const order = await this.purchaseOrdersRepository.convertRequestToOrder({
      requestId: request.id,
      orderNumber,
      supplierId: dto.supplierId,
      createdByUserId: currentUser.sub,
      expectedAt: this.parseOptionalDate(dto.expectedAt),
      notes: this.normalizeOptionalString(dto.notes),
      items: request.items.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitCost: item.estimatedUnitCost,
        notes: item.notes,
      })),
    });

    await this.recordAudit(
      currentUser,
      'procurement.purchase_orders.created_from_request',
      {
        entityType: 'PurchaseOrder',
        entityId: order.id,
        metadata: {
          requestId: request.id,
          requestNumber: request.requestNumber,
          order: this.purchaseOrderAuditSnapshot(order),
        },
      },
    );

    return this.serializePurchaseOrder(order);
  }

  async listPurchaseOrders(
    _currentUser: CurrentUserPayload,
    query: GetPurchaseOrdersQueryDto,
  ) {
    const { page, limit, createdFrom, createdTo } = this.parseListQuery(query);
    const [total, orders] = await this.purchaseOrdersRepository.listOrders({
      skip: (page - 1) * limit,
      take: limit,
      search: this.normalizeOptionalString(query.search) ?? undefined,
      status: query.status,
      supplierId: query.supplierId,
      createdFrom,
      createdTo,
    });

    return this.paginate(
      orders.map((order) => this.serializePurchaseOrder(order)),
      total,
      page,
      limit,
    );
  }

  async getPurchaseOrderById(
    _currentUser: CurrentUserPayload,
    orderId: number,
  ) {
    return this.serializePurchaseOrder(
      await this.findRequiredPurchaseOrder(orderId),
    );
  }

  async updatePurchaseOrder(
    currentUser: CurrentUserPayload,
    orderId: number,
    dto: UpdatePurchaseOrderDto,
  ) {
    const order = await this.findRequiredPurchaseOrder(orderId);

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new ConflictException('Only draft purchase orders can be updated.');
    }

    await this.assertActiveSupplier(dto.supplierId);
    if (dto.items) {
      await this.assertActiveItems(dto.items, this.purchaseOrdersRepository);
    }

    const data: Prisma.PurchaseOrderUncheckedUpdateInput = {};

    if (dto.supplierId !== undefined) data.supplierId = dto.supplierId;
    if (dto.purchaseRequestId !== undefined) {
      data.purchaseRequestId = dto.purchaseRequestId;
    }
    if (dto.expectedAt !== undefined) {
      data.expectedAt = this.parseOptionalDate(dto.expectedAt);
    }
    if (dto.notes !== undefined)
      data.notes = this.normalizeOptionalString(dto.notes);

    const items = dto.items ? this.toOrderItems(dto.items) : undefined;

    if (Object.keys(data).length === 0 && !items) {
      return this.serializePurchaseOrder(order);
    }

    const updated = await this.purchaseOrdersRepository.updateOrder(
      order.id,
      data,
      items,
    );

    await this.recordAudit(currentUser, 'procurement.purchase_orders.updated', {
      entityType: 'PurchaseOrder',
      entityId: updated.id,
      metadata: {
        previous: this.purchaseOrderAuditSnapshot(order),
        current: this.purchaseOrderAuditSnapshot(updated),
      },
    });

    return this.serializePurchaseOrder(updated);
  }

  async approvePurchaseOrder(
    currentUser: CurrentUserPayload,
    orderId: number,
    dto: ApprovePurchaseOrderDto,
  ) {
    const order = await this.findRequiredPurchaseOrder(orderId);

    if (
      order.status !== PurchaseOrderStatus.DRAFT &&
      order.status !== PurchaseOrderStatus.SUBMITTED
    ) {
      throw new ConflictException(
        'Only draft or submitted purchase orders can be approved.',
      );
    }

    const approved = await this.purchaseOrdersRepository.updateOrder(order.id, {
      status: PurchaseOrderStatus.APPROVED,
      approvedByUserId: currentUser.sub,
      notes: dto.notes ? this.normalizeOptionalString(dto.notes) : order.notes,
    });

    await this.recordAudit(
      currentUser,
      'procurement.purchase_orders.approved',
      {
        entityType: 'PurchaseOrder',
        entityId: approved.id,
        metadata: this.purchaseOrderAuditSnapshot(approved),
      },
    );

    return this.serializePurchaseOrder(approved);
  }

  async markPurchaseOrderOrdered(
    currentUser: CurrentUserPayload,
    orderId: number,
    dto: MarkPurchaseOrderOrderedDto,
  ) {
    const order = await this.findRequiredPurchaseOrder(orderId);

    if (order.status !== PurchaseOrderStatus.APPROVED) {
      throw new ConflictException(
        'Only approved purchase orders can be marked ordered.',
      );
    }

    const ordered = await this.purchaseOrdersRepository.updateOrder(order.id, {
      status: PurchaseOrderStatus.ORDERED,
      orderedAt: dto.orderedAt ? new Date(dto.orderedAt) : new Date(),
      notes: dto.notes ? this.normalizeOptionalString(dto.notes) : order.notes,
    });

    await this.recordAudit(currentUser, 'procurement.purchase_orders.ordered', {
      entityType: 'PurchaseOrder',
      entityId: ordered.id,
      metadata: this.purchaseOrderAuditSnapshot(ordered),
    });

    return this.serializePurchaseOrder(ordered);
  }

  async cancelPurchaseOrder(
    currentUser: CurrentUserPayload,
    orderId: number,
    dto: CancelPurchaseOrderDto,
  ) {
    const order = await this.findRequiredPurchaseOrder(orderId);

    if (
      order.status === PurchaseOrderStatus.RECEIVED ||
      order.status === PurchaseOrderStatus.CANCELLED
    ) {
      throw new ConflictException('This purchase order cannot be cancelled.');
    }

    const cancelled = await this.purchaseOrdersRepository.updateOrder(
      order.id,
      {
        status: PurchaseOrderStatus.CANCELLED,
        notes: this.appendDecisionNote(
          order.notes,
          this.normalizeRequiredString(
            dto.reason,
            'Purchase order cancellation reason is required.',
          ),
        ),
      },
    );

    await this.recordAudit(
      currentUser,
      'procurement.purchase_orders.cancelled',
      {
        entityType: 'PurchaseOrder',
        entityId: cancelled.id,
        metadata: this.purchaseOrderAuditSnapshot(cancelled),
      },
    );

    return this.serializePurchaseOrder(cancelled);
  }

  async createGoodsReceived(
    currentUser: CurrentUserPayload,
    dto: CreateGoodsReceivedDto,
  ) {
    await this.assertActiveSupplier(dto.supplierId);
    const activeLocation =
      await this.goodsReceivedRepository.findActiveLocation(dto.locationId);

    if (!activeLocation) {
      throw new ConflictException('Goods received location must be active.');
    }

    await this.assertActiveItems(dto.items, this.goodsReceivedRepository);

    if (dto.purchaseOrderId) {
      const order = await this.findRequiredPurchaseOrder(dto.purchaseOrderId);

      if (
        order.status === PurchaseOrderStatus.CANCELLED ||
        order.status === PurchaseOrderStatus.RECEIVED
      ) {
        throw new ConflictException(
          'Goods received cannot be created for this purchase order status.',
        );
      }

      const orderItemIds = new Set(order.items.map((item) => item.itemId));
      const invalidItem = dto.items.find(
        (item) => !orderItemIds.has(item.itemId),
      );

      if (invalidItem) {
        throw new BadRequestException(
          'Goods received items must exist on the linked purchase order.',
        );
      }
    }

    const grnNumber = await this.generateGrnNumber();
    const grn = await this.goodsReceivedRepository.createGoodsReceived({
      grnNumber,
      purchaseOrderId: dto.purchaseOrderId,
      supplierId: dto.supplierId,
      locationId: dto.locationId,
      receivedByUserId: currentUser.sub,
      notes: this.normalizeOptionalString(dto.notes),
      items: dto.items.map((item) => ({
        itemId: item.itemId,
        quantity: new Prisma.Decimal(item.quantity),
        unitCost:
          item.unitCost === undefined
            ? null
            : new Prisma.Decimal(item.unitCost),
        notes: this.normalizeOptionalString(item.notes),
      })),
    });

    await this.recordAudit(currentUser, 'procurement.goods_received.created', {
      entityType: 'GoodsReceived',
      entityId: grn.id,
      metadata: this.goodsReceivedAuditSnapshot(grn),
    });

    return this.serializeGoodsReceived(grn);
  }

  async listGoodsReceived(
    _currentUser: CurrentUserPayload,
    query: GetGoodsReceivedQueryDto,
  ) {
    const { page, limit, createdFrom, createdTo } = this.parseListQuery(query);
    const [total, grns] = await this.goodsReceivedRepository.listGoodsReceived({
      skip: (page - 1) * limit,
      take: limit,
      search: this.normalizeOptionalString(query.search) ?? undefined,
      status: query.status,
      supplierId: query.supplierId,
      locationId: query.locationId,
      createdFrom,
      createdTo,
    });

    return this.paginate(
      grns.map((grn) => this.serializeGoodsReceived(grn)),
      total,
      page,
      limit,
    );
  }

  async getGoodsReceivedById(_currentUser: CurrentUserPayload, grnId: number) {
    return this.serializeGoodsReceived(
      await this.findRequiredGoodsReceived(grnId),
    );
  }

  async postGoodsReceived(
    currentUser: CurrentUserPayload,
    grnId: number,
    dto: PostGoodsReceivedDto,
  ) {
    const grn = await this.findRequiredGoodsReceived(grnId);
    const movementNumbers: string[] = [];

    for (let index = 0; index < grn.items.length; index += 1) {
      movementNumbers.push(this.generateGrnMovementNumber());
    }

    const result = await this.goodsReceivedRepository.postGoodsReceived({
      grnId: grn.id,
      movementNumbers,
      postedAt: new Date(),
      notes: this.normalizeOptionalString(dto.notes),
      actorUserId: currentUser.sub,
    });

    if (result.status === 'NOT_FOUND') {
      throw new NotFoundException('Goods received note was not found.');
    }
    if (result.status === 'ALREADY_POSTED') {
      throw new ConflictException('Goods received note is already posted.');
    }
    if (result.status === 'CANCELLED') {
      throw new ConflictException(
        'Cancelled goods received note cannot be posted.',
      );
    }
    if (result.status === 'INACTIVE_LOCATION') {
      throw new ConflictException('Goods received location must be active.');
    }
    if (result.status === 'INACTIVE_ITEM') {
      throw new ConflictException('Goods received items must be active.');
    }

    await this.recordAudit(currentUser, 'procurement.goods_received.posted', {
      entityType: 'GoodsReceived',
      entityId: result.grn.id,
      metadata: {
        grn: this.goodsReceivedAuditSnapshot(result.grn),
        movementNumbers,
      },
    });

    return this.serializeGoodsReceived(result.grn);
  }

  async cancelGoodsReceived(
    currentUser: CurrentUserPayload,
    grnId: number,
    dto: CancelGoodsReceivedDto,
  ) {
    const grn = await this.findRequiredGoodsReceived(grnId);

    if (grn.status !== GoodsReceivedStatus.DRAFT) {
      throw new ConflictException(
        'Only draft goods received notes can be cancelled.',
      );
    }

    const cancelled = await this.goodsReceivedRepository.cancelGoodsReceived(
      grn.id,
      {
        status: GoodsReceivedStatus.CANCELLED,
        notes: this.appendDecisionNote(
          grn.notes,
          this.normalizeRequiredString(
            dto.reason,
            'Goods received cancellation reason is required.',
          ),
        ),
      },
    );

    await this.recordAudit(
      currentUser,
      'procurement.goods_received.cancelled',
      {
        entityType: 'GoodsReceived',
        entityId: cancelled.id,
        metadata: this.goodsReceivedAuditSnapshot(cancelled),
      },
    );

    return this.serializeGoodsReceived(cancelled);
  }

  async getProcurementDashboard(
    currentUser: CurrentUserPayload,
    query: ProcurementDashboardQueryDto,
  ) {
    void currentUser;
    void query;

    const [
      pendingPurchaseRequests,
      approvedPurchaseRequests,
      openPurchaseOrders,
      partiallyReceivedOrders,
      receivedOrders,
      activeSuppliers,
      draftGoodsReceived,
    ] = await this.procurementReportsRepository.getDashboardCounts();

    return {
      pendingPurchaseRequests,
      approvedPurchaseRequests,
      openPurchaseOrders,
      partiallyReceivedOrders,
      receivedOrders,
      activeSuppliers,
      draftGoodsReceived,
    };
  }

  async createSupplier(
    currentUser: CurrentUserPayload,
    createSupplierDto: CreateSupplierDto,
  ) {
    const supplierNumber = this.normalizeSupplierNumber(
      createSupplierDto.supplierNumber,
    );
    const duplicate =
      await this.suppliersRepository.findBySupplierNumber(supplierNumber);

    if (duplicate) {
      throw new ConflictException('Supplier number already exists.');
    }

    const supplier = await this.suppliersRepository.createSupplier({
      supplierNumber,
      name: this.normalizeRequiredString(
        createSupplierDto.name,
        'Supplier name is required.',
      ),
      contactName: this.normalizeOptionalString(createSupplierDto.contactName),
      phone: this.normalizeOptionalString(createSupplierDto.phone),
      email: this.normalizeOptionalString(createSupplierDto.email),
      address: this.normalizeOptionalString(createSupplierDto.address),
      notes: this.normalizeOptionalString(createSupplierDto.notes),
    });

    await this.recordSupplierAudit(
      currentUser,
      'procurement.suppliers.created',
      supplier,
      this.supplierAuditSnapshot(supplier),
    );

    return supplier;
  }

  async listSuppliers(
    _currentUser: CurrentUserPayload,
    query: GetSuppliersQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [total, suppliers] = await this.suppliersRepository.listSuppliers({
      skip: (page - 1) * limit,
      take: limit,
      search: this.normalizeOptionalString(query.search) ?? undefined,
      status: query.status,
    });

    return this.paginate(suppliers, total, page, limit);
  }

  async getSupplierById(_currentUser: CurrentUserPayload, supplierId: number) {
    return this.findRequiredSupplier(supplierId);
  }

  async updateSupplier(
    currentUser: CurrentUserPayload,
    supplierId: number,
    updateSupplierDto: UpdateSupplierDto,
  ) {
    const supplier = await this.findRequiredSupplier(supplierId);
    const data: Prisma.SupplierUncheckedUpdateInput = {};

    if (updateSupplierDto.supplierNumber !== undefined) {
      const supplierNumber = this.normalizeSupplierNumber(
        updateSupplierDto.supplierNumber,
      );

      if (supplierNumber !== supplier.supplierNumber) {
        const duplicate = await this.suppliersRepository.findBySupplierNumber(
          supplierNumber,
          supplier.id,
        );

        if (duplicate) {
          throw new ConflictException('Supplier number already exists.');
        }
      }

      data.supplierNumber = supplierNumber;
    }

    if (updateSupplierDto.name !== undefined) {
      data.name = this.normalizeRequiredString(
        updateSupplierDto.name,
        'Supplier name is required.',
      );
    }

    if (updateSupplierDto.contactName !== undefined) {
      data.contactName = this.normalizeOptionalString(
        updateSupplierDto.contactName,
      );
    }

    if (updateSupplierDto.phone !== undefined) {
      data.phone = this.normalizeOptionalString(updateSupplierDto.phone);
    }

    if (updateSupplierDto.email !== undefined) {
      data.email = this.normalizeOptionalString(updateSupplierDto.email);
    }

    if (updateSupplierDto.address !== undefined) {
      data.address = this.normalizeOptionalString(updateSupplierDto.address);
    }

    if (updateSupplierDto.notes !== undefined) {
      data.notes = this.normalizeOptionalString(updateSupplierDto.notes);
    }

    if (Object.keys(data).length === 0) {
      return supplier;
    }

    const updatedSupplier = await this.suppliersRepository.updateSupplier(
      supplier.id,
      data,
    );

    await this.recordSupplierAudit(
      currentUser,
      'procurement.suppliers.updated',
      updatedSupplier,
      {
        previous: this.supplierAuditSnapshot(supplier),
        current: this.supplierAuditSnapshot(updatedSupplier),
      },
    );

    return updatedSupplier;
  }

  async deactivateSupplier(
    currentUser: CurrentUserPayload,
    supplierId: number,
  ) {
    const supplier = await this.findRequiredSupplier(supplierId);

    if (supplier.status === SupplierStatus.INACTIVE) {
      return supplier;
    }

    const updatedSupplier = await this.suppliersRepository.updateSupplier(
      supplier.id,
      {
        status: SupplierStatus.INACTIVE,
      },
    );

    await this.recordSupplierAudit(
      currentUser,
      'procurement.suppliers.deactivated',
      updatedSupplier,
      {
        previousStatus: supplier.status,
        status: updatedSupplier.status,
      },
    );

    return updatedSupplier;
  }

  private async assertActiveSupplier(supplierId?: number) {
    if (supplierId === undefined) {
      return;
    }

    const supplier = await this.findRequiredSupplier(supplierId);

    if (supplier.status !== SupplierStatus.ACTIVE) {
      throw new ConflictException('Supplier must be active.');
    }
  }

  private async assertActiveItems(
    items: Array<{ itemId: number }>,
    repository: {
      findActiveItems(itemIds: number[]): Promise<Array<{ id: number }>>;
    },
  ) {
    const uniqueIds = [...new Set(items.map((item) => item.itemId))];
    const activeItems = await repository.findActiveItems(uniqueIds);

    if (activeItems.length !== uniqueIds.length) {
      throw new ConflictException('All procurement items must be active.');
    }
  }

  private async findRequiredSupplier(supplierId: number) {
    const supplier = await this.suppliersRepository.findSupplier(supplierId);

    if (!supplier) {
      throw new NotFoundException('Supplier was not found.');
    }

    return supplier;
  }

  private async findRequiredPurchaseRequest(requestId: number) {
    const request =
      await this.purchaseRequestsRepository.findRequest(requestId);

    if (!request) {
      throw new NotFoundException('Purchase request was not found.');
    }

    return request;
  }

  private async findRequiredPurchaseOrder(orderId: number) {
    const order = await this.purchaseOrdersRepository.findOrder(orderId);

    if (!order) {
      throw new NotFoundException('Purchase order was not found.');
    }

    return order;
  }

  private async findRequiredGoodsReceived(grnId: number) {
    const grn = await this.goodsReceivedRepository.findGoodsReceived(grnId);

    if (!grn) {
      throw new NotFoundException('Goods received note was not found.');
    }

    return grn;
  }

  private assertSubmittedRequest(request: PurchaseRequestRecord) {
    if (request.status !== PurchaseRequestStatus.SUBMITTED) {
      throw new ConflictException(
        'Only submitted purchase requests can be decided.',
      );
    }
  }

  private parseListQuery(query: {
    page?: number;
    limit?: number;
    createdFrom?: string;
    createdTo?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const createdFrom = this.parseOptionalDate(query.createdFrom);
    const createdTo = this.parseOptionalDate(query.createdTo);

    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new BadRequestException('createdFrom must be before createdTo.');
    }

    return { page, limit, createdFrom, createdTo };
  }

  private toRequestItems(items: PurchaseRequestItemDto[]) {
    return items.map((item) => ({
      itemId: item.itemId,
      quantity: new Prisma.Decimal(item.quantity),
      estimatedUnitCost:
        item.estimatedUnitCost === undefined
          ? null
          : new Prisma.Decimal(item.estimatedUnitCost),
      notes: this.normalizeOptionalString(item.notes),
    }));
  }

  private toOrderItems(items: PurchaseOrderItemDto[]) {
    return items.map((item) => ({
      itemId: item.itemId,
      quantity: new Prisma.Decimal(item.quantity),
      unitCost:
        item.unitCost === undefined ? null : new Prisma.Decimal(item.unitCost),
      notes: this.normalizeOptionalString(item.notes),
    }));
  }

  private paginate<T>(items: T[], total: number, page: number, limit: number) {
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private normalizeSupplierNumber(value: string) {
    return this.normalizeRequiredString(
      value,
      'Supplier number is required.',
    ).toUpperCase();
  }

  private normalizeRequiredString(value: string, message: string) {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(message);
    }

    return normalized;
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = value?.trim();

    return normalized || null;
  }

  private parseOptionalDate(value?: string) {
    return value ? new Date(value) : undefined;
  }

  private appendDecisionNote(existing: string | null, note: string) {
    return existing ? `${existing}\n${note}` : note;
  }

  private serializePurchaseRequest(request: PurchaseRequestRecord) {
    return {
      ...request,
      items: request.items.map((item) => ({
        ...item,
        quantity: item.quantity.toFixed(2),
        estimatedUnitCost: item.estimatedUnitCost?.toFixed(2) ?? null,
      })),
    };
  }

  private serializePurchaseOrder(order: PurchaseOrderRecord) {
    return {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        quantity: item.quantity.toFixed(2),
        unitCost: item.unitCost?.toFixed(2) ?? null,
        receivedQuantity: item.receivedQuantity.toFixed(2),
      })),
    };
  }

  private serializeGoodsReceived(grn: GoodsReceivedRecord) {
    return {
      ...grn,
      items: grn.items.map((item) => ({
        ...item,
        quantity: item.quantity.toFixed(2),
        unitCost: item.unitCost?.toFixed(2) ?? null,
        item: {
          ...item.item,
          averageCost: item.item.averageCost?.toFixed(2) ?? null,
        },
      })),
    };
  }

  private supplierAuditSnapshot(supplier: SupplierRecord) {
    return {
      supplierNumber: supplier.supplierNumber,
      name: supplier.name,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      status: supplier.status,
      notes: supplier.notes,
    };
  }

  private purchaseRequestAuditSnapshot(request: PurchaseRequestRecord) {
    return {
      requestNumber: request.requestNumber,
      status: request.status,
      departmentId: request.departmentId,
      requestedByUserId: request.requestedByUserId,
      reason: request.reason,
      decisionNote: request.decisionNote,
      itemCount: request.items.length,
    };
  }

  private purchaseOrderAuditSnapshot(order: PurchaseOrderRecord) {
    return {
      orderNumber: order.orderNumber,
      status: order.status,
      supplierId: order.supplierId,
      purchaseRequestId: order.purchaseRequestId,
      orderedAt: order.orderedAt,
      expectedAt: order.expectedAt,
      itemCount: order.items.length,
    };
  }

  private goodsReceivedAuditSnapshot(grn: GoodsReceivedRecord) {
    return {
      grnNumber: grn.grnNumber,
      status: grn.status,
      purchaseOrderId: grn.purchaseOrderId,
      supplierId: grn.supplierId,
      locationId: grn.locationId,
      postedAt: grn.postedAt,
      itemCount: grn.items.length,
    };
  }

  private recordSupplierAudit(
    currentUser: CurrentUserPayload,
    action: string,
    supplier: SupplierRecord,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'Supplier',
      entityId: supplier.id.toString(),
      metadata,
    });
  }

  private recordAudit(
    currentUser: CurrentUserPayload,
    input: {
      entityType: string;
      entityId: number;
      metadata: Prisma.InputJsonValue;
    },
  ): Promise<unknown>;
  private recordAudit(
    currentUser: CurrentUserPayload,
    action: string,
    input: {
      entityType: string;
      entityId: number;
      metadata: Prisma.InputJsonValue;
    },
  ): Promise<unknown>;
  private recordAudit(
    currentUser: CurrentUserPayload,
    actionOrInput:
      | string
      | {
          entityType: string;
          entityId: number;
          metadata: Prisma.InputJsonValue;
        },
    maybeInput?: {
      entityType: string;
      entityId: number;
      metadata: Prisma.InputJsonValue;
    },
  ) {
    const action =
      typeof actionOrInput === 'string' ? actionOrInput : 'procurement.action';
    const input =
      typeof actionOrInput === 'string' ? maybeInput : actionOrInput;

    if (!input) {
      throw new BadRequestException('Audit input is required.');
    }

    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: input.entityType,
      entityId: input.entityId.toString(),
      metadata: input.metadata,
    });
  }

  private async generateRequestNumber() {
    return this.generateNumber('PR', (value) =>
      this.purchaseRequestsRepository.findByRequestNumber(value),
    );
  }

  private async generateOrderNumber() {
    return this.generateNumber('PO', (value) =>
      this.purchaseOrdersRepository.findByOrderNumber(value),
    );
  }

  private async generateGrnNumber() {
    return this.generateNumber('GRN', (value) =>
      this.goodsReceivedRepository.findByGrnNumber(value),
    );
  }

  private generateGrnMovementNumber() {
    return `MOV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Date.now()
      .toString()
      .slice(-6)}${Math.floor(Math.random() * 10)}`;
  }

  private async generateNumber(
    prefix: string,
    findExisting: (value: string) => Promise<{ id: number } | null>,
  ) {
    const datePart = new Date().toISOString().slice(0, 10).replaceAll('-', '');

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const sequence = `${Date.now().toString().slice(-6)}${attempt}`.slice(-6);
      const value = `${prefix}-${datePart}-${sequence}`;
      const existing = await findExisting(value);

      if (!existing) {
        return value;
      }
    }

    throw new ConflictException(
      `Unable to generate a unique ${prefix} number.`,
    );
  }
}
