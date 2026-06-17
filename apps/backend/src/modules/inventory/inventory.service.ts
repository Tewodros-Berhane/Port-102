import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InventoryItemStatus,
  Prisma,
  StockAdjustmentStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { ApproveStockAdjustmentDto } from './dto/approve-stock-adjustment.dto';
import { CancelStockAdjustmentDto } from './dto/cancel-stock-adjustment.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateInventoryLocationDto } from './dto/create-inventory-location.dto';
import { GetInventoryItemsQueryDto } from './dto/get-inventory-items-query.dto';
import { GetInventoryLocationsQueryDto } from './dto/get-inventory-locations-query.dto';
import { GetReorderAlertsQueryDto } from './dto/get-reorder-alerts-query.dto';
import { GetStockAdjustmentsQueryDto } from './dto/get-stock-adjustments-query.dto';
import { GetStockBalancesQueryDto } from './dto/get-stock-balances-query.dto';
import { GetStockMovementsQueryDto } from './dto/get-stock-movements-query.dto';
import { InventoryDashboardQueryDto } from './dto/inventory-dashboard-query.dto';
import { IssueStockDto } from './dto/issue-stock.dto';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { RejectStockAdjustmentDto } from './dto/reject-stock-adjustment.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { UpdateInventoryLocationDto } from './dto/update-inventory-location.dto';
import {
  InventoryItemRecord,
  InventoryItemsRepository,
} from './repositories/inventory-items.repository';
import {
  InventoryLocationRecord,
  InventoryLocationsRepository,
} from './repositories/inventory-locations.repository';
import {
  DashboardMovementRecord,
  InventoryReportsRepository,
  ReorderAlertItemRecord,
} from './repositories/inventory-reports.repository';
import {
  StockAdjustmentRecord,
  StockAdjustmentsRepository,
} from './repositories/stock-adjustments.repository';
import {
  StockBalanceRecord,
  StockBalancesRepository,
} from './repositories/stock-balances.repository';
import { StockIssuesRepository } from './repositories/stock-issues.repository';
import {
  StockMovementRecord,
  StockMovementsRepository,
} from './repositories/stock-movements.repository';
import { StockReceiptsRepository } from './repositories/stock-receipts.repository';
import { StockTransfersRepository } from './repositories/stock-transfers.repository';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryLocationsRepository: InventoryLocationsRepository,
    private readonly inventoryItemsRepository: InventoryItemsRepository,
    private readonly inventoryReportsRepository: InventoryReportsRepository,
    private readonly stockAdjustmentsRepository: StockAdjustmentsRepository,
    private readonly stockBalancesRepository: StockBalancesRepository,
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly stockReceiptsRepository: StockReceiptsRepository,
    private readonly stockIssuesRepository: StockIssuesRepository,
    private readonly stockTransfersRepository: StockTransfersRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async listStockBalances(
    _currentUser: CurrentUserPayload,
    query: GetStockBalancesQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [total, balances] = await this.stockBalancesRepository.listBalances({
      skip: (page - 1) * limit,
      take: limit,
      search: this.normalizeOptionalString(query.search) ?? undefined,
      itemId: query.itemId,
      locationId: query.locationId,
    });

    return {
      items: balances.map((balance) => this.serializeBalance(balance)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStockBalancesByItem(
    currentUser: CurrentUserPayload,
    itemId: number,
    query: GetStockBalancesQueryDto,
  ) {
    await this.findRequiredItem(itemId);

    return this.listStockBalances(currentUser, {
      ...query,
      itemId,
    });
  }

  async listStockMovements(
    _currentUser: CurrentUserPayload,
    query: GetStockMovementsQueryDto,
  ) {
    const createdFrom = this.parseOptionalDate(query.createdFrom);
    const createdTo = this.parseOptionalDate(query.createdTo);

    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new BadRequestException(
        'Movement createdFrom must be before or equal to createdTo.',
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [total, movements] =
      await this.stockMovementsRepository.listMovements({
        skip: (page - 1) * limit,
        take: limit,
        search: this.normalizeOptionalString(query.search) ?? undefined,
        type: query.type,
        itemId: query.itemId,
        locationId: query.locationId,
        createdFrom,
        createdTo,
      });

    return {
      items: movements.map((movement) => this.serializeMovement(movement)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listReorderAlerts(
    _currentUser: CurrentUserPayload,
    query: GetReorderAlertsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.normalizeOptionalString(query.search) ?? undefined;
    const candidates =
      await this.inventoryReportsRepository.listReorderAlertCandidates({
        skip: (page - 1) * limit,
        take: limit,
        search,
        locationId: query.locationId,
      });
    const totalCandidates =
      await this.inventoryReportsRepository.countReorderAlertCandidates({
        search,
      });
    const alerts = candidates
      .map((item) => this.toReorderAlert(item, query.locationId))
      .filter((alert) => alert !== null);

    return {
      items: alerts,
      pagination: {
        page,
        limit,
        total: totalCandidates,
        totalPages: Math.ceil(totalCandidates / limit),
      },
    };
  }

  async getInventoryDashboard(
    _currentUser: CurrentUserPayload,
    query: InventoryDashboardQueryDto,
  ) {
    const recentMovementsLimit = query.recentMovementsLimit ?? 10;
    const [
      totalActiveItems,
      lowStockCandidates,
      totalStockValue,
      recentMovements,
      stockByItemTypeRows,
    ] = await Promise.all([
      this.inventoryReportsRepository.countActiveItems(),
      this.inventoryReportsRepository.countLowStockCandidates(query.locationId),
      this.inventoryReportsRepository.calculateStockValue(query.locationId),
      this.inventoryReportsRepository.recentMovements(
        recentMovementsLimit,
        query.locationId,
      ),
      this.inventoryReportsRepository.stockByItemType(query.locationId),
    ]);
    const lowStockItems = lowStockCandidates.filter((item) => {
      const totalQuantity = item.balances.reduce(
        (total, balance) => total.add(balance.quantity),
        new Prisma.Decimal(0),
      );

      return item.reorderLevel
        ? totalQuantity.lessThanOrEqualTo(item.reorderLevel)
        : false;
    }).length;
    const stockByItemType = stockByItemTypeRows.reduce<
      Record<string, { itemCount: number; quantity: string }>
    >((summary, item) => {
      const quantity = item.balances.reduce(
        (total, balance) => total.add(balance.quantity),
        new Prisma.Decimal(0),
      );
      const current = summary[item.type] ?? {
        itemCount: 0,
        quantity: '0.00',
      };
      const nextQuantity = new Prisma.Decimal(current.quantity).add(quantity);

      summary[item.type] = {
        itemCount: current.itemCount + 1,
        quantity: nextQuantity.toFixed(2),
      };

      return summary;
    }, {});

    return {
      totalActiveItems,
      lowStockItems,
      totalStockValue: totalStockValue.toFixed(2),
      recentMovements: recentMovements.map((movement) =>
        this.serializeDashboardMovement(movement),
      ),
      stockByItemType,
    };
  }

  async receiveStock(
    currentUser: CurrentUserPayload,
    receiveStockDto: ReceiveStockDto,
  ) {
    const [item, location] = await Promise.all([
      this.findRequiredItem(receiveStockDto.itemId),
      this.findRequiredLocation(receiveStockDto.locationId),
    ]);

    if (item.status !== InventoryItemStatus.ACTIVE) {
      throw new ConflictException(
        'Inactive inventory item cannot receive stock.',
      );
    }

    if (!location.isActive) {
      throw new ConflictException(
        'Inactive inventory location cannot receive stock.',
      );
    }

    const quantity = new Prisma.Decimal(receiveStockDto.quantity);
    const unitCost =
      receiveStockDto.unitCost === undefined
        ? undefined
        : new Prisma.Decimal(receiveStockDto.unitCost);
    const movementNumber = await this.generateMovementNumber();
    const receipt = await this.stockReceiptsRepository.receiveStock({
      movementNumber,
      itemId: item.id,
      locationId: location.id,
      quantity,
      unitCost,
      referenceType: this.normalizeOptionalString(
        receiveStockDto.referenceType,
      ),
      referenceId: receiveStockDto.referenceId,
      reason: this.normalizeOptionalString(receiveStockDto.reason),
      notes: this.normalizeOptionalString(receiveStockDto.notes),
      createdByUserId: currentUser.sub,
    });

    if (!receipt) {
      throw new ConflictException(
        'Inventory item or location became inactive before stock was received.',
      );
    }

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'inventory.stock.received',
      entityType: 'StockMovement',
      entityId: receipt.movement.id.toString(),
      metadata: {
        movementNumber,
        itemId: item.id,
        locationId: location.id,
        quantity: quantity.toFixed(2),
        unitCost: unitCost?.toFixed(2) ?? null,
        totalCost: receipt.movement.totalCost?.toFixed(2) ?? null,
        balanceQuantity: receipt.balance.quantity.toFixed(2),
        averageCost: receipt.averageCost?.toFixed(2) ?? null,
      },
    });

    return {
      movement: this.serializeMovement(receipt.movement),
      balance: this.serializeBalance(receipt.balance),
      averageCost: receipt.averageCost?.toFixed(2) ?? null,
    };
  }

  async issueStock(
    currentUser: CurrentUserPayload,
    issueStockDto: IssueStockDto,
  ) {
    const [item, location] = await Promise.all([
      this.findRequiredItem(issueStockDto.itemId),
      this.findRequiredLocation(issueStockDto.locationId),
    ]);

    if (item.status !== InventoryItemStatus.ACTIVE) {
      throw new ConflictException(
        'Inactive inventory item cannot issue stock.',
      );
    }

    if (!location.isActive) {
      throw new ConflictException(
        'Inactive inventory location cannot issue stock.',
      );
    }

    const quantity = new Prisma.Decimal(issueStockDto.quantity);
    const movementNumber = await this.generateMovementNumber();
    const issue = await this.stockIssuesRepository.issueStock({
      movementNumber,
      itemId: item.id,
      locationId: location.id,
      quantity,
      referenceType: this.normalizeOptionalString(issueStockDto.referenceType),
      referenceId: issueStockDto.referenceId,
      reason: this.normalizeOptionalString(issueStockDto.reason),
      notes: this.normalizeOptionalString(issueStockDto.notes),
      createdByUserId: currentUser.sub,
    });

    if (issue.status === 'INACTIVE') {
      throw new ConflictException(
        'Inventory item or location became inactive before stock was issued.',
      );
    }

    if (issue.status === 'INSUFFICIENT') {
      throw new ConflictException(
        `Insufficient stock. Available quantity is ${issue.availableQuantity.toFixed(2)}.`,
      );
    }

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'inventory.stock.issued',
      entityType: 'StockMovement',
      entityId: issue.movement.id.toString(),
      metadata: {
        movementNumber,
        itemId: item.id,
        locationId: location.id,
        quantity: quantity.toFixed(2),
        unitCost: issue.movement.unitCost?.toFixed(2) ?? null,
        totalCost: issue.movement.totalCost?.toFixed(2) ?? null,
        balanceQuantity: issue.balance.quantity.toFixed(2),
        referenceType: issue.movement.referenceType,
        referenceId: issue.movement.referenceId,
      },
    });

    return {
      movement: this.serializeMovement(issue.movement),
      balance: this.serializeBalance(issue.balance),
    };
  }

  async transferStock(
    currentUser: CurrentUserPayload,
    transferStockDto: TransferStockDto,
  ) {
    if (transferStockDto.fromLocationId === transferStockDto.toLocationId) {
      throw new BadRequestException(
        'Transfer source and destination locations must be different.',
      );
    }

    const [item, fromLocation, toLocation] = await Promise.all([
      this.findRequiredItem(transferStockDto.itemId),
      this.findRequiredLocation(transferStockDto.fromLocationId),
      this.findRequiredLocation(transferStockDto.toLocationId),
    ]);

    if (item.status !== InventoryItemStatus.ACTIVE) {
      throw new ConflictException(
        'Inactive inventory item cannot be transferred.',
      );
    }

    if (!fromLocation.isActive || !toLocation.isActive) {
      throw new ConflictException(
        'Inactive inventory location cannot transfer stock.',
      );
    }

    const quantity = new Prisma.Decimal(transferStockDto.quantity);
    const transferOutMovementNumber = await this.generateMovementNumber();
    const transferInMovementNumber = await this.generateMovementNumber();
    const transfer = await this.stockTransfersRepository.transferStock({
      transferOutMovementNumber,
      transferInMovementNumber,
      itemId: item.id,
      fromLocationId: fromLocation.id,
      toLocationId: toLocation.id,
      quantity,
      referenceType: this.normalizeOptionalString(
        transferStockDto.referenceType,
      ),
      referenceId: transferStockDto.referenceId,
      reason: this.normalizeOptionalString(transferStockDto.reason),
      notes: this.normalizeOptionalString(transferStockDto.notes),
      createdByUserId: currentUser.sub,
    });

    if (transfer.status === 'INACTIVE') {
      throw new ConflictException(
        'Inventory item or location became inactive before stock was transferred.',
      );
    }

    if (transfer.status === 'INSUFFICIENT') {
      throw new ConflictException(
        `Insufficient stock. Available quantity is ${transfer.availableQuantity.toFixed(2)}.`,
      );
    }

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'inventory.stock.transferred',
      entityType: 'StockMovement',
      entityId: transfer.transferOutMovement.id.toString(),
      metadata: {
        transferOutMovementNumber,
        transferInMovementNumber,
        itemId: item.id,
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
        quantity: quantity.toFixed(2),
        fromBalanceQuantity: transfer.fromBalance.quantity.toFixed(2),
        toBalanceQuantity: transfer.toBalance.quantity.toFixed(2),
      },
    });

    return {
      transferOutMovement: this.serializeMovement(transfer.transferOutMovement),
      transferInMovement: this.serializeMovement(transfer.transferInMovement),
      fromBalance: this.serializeBalance(transfer.fromBalance),
      toBalance: this.serializeBalance(transfer.toBalance),
    };
  }

  async createStockAdjustment(
    currentUser: CurrentUserPayload,
    createAdjustmentDto: CreateStockAdjustmentDto,
  ) {
    const [item, location] = await Promise.all([
      this.findRequiredItem(createAdjustmentDto.itemId),
      this.findRequiredLocation(createAdjustmentDto.locationId),
    ]);

    if (item.status !== InventoryItemStatus.ACTIVE) {
      throw new ConflictException(
        'Inactive inventory item cannot be adjusted.',
      );
    }

    if (!location.isActive) {
      throw new ConflictException(
        'Inactive inventory location cannot be adjusted.',
      );
    }

    const adjustmentNumber = await this.generateAdjustmentNumber();
    const adjustment = await this.stockAdjustmentsRepository.createAdjustment({
      adjustmentNumber,
      itemId: item.id,
      locationId: location.id,
      quantity: new Prisma.Decimal(createAdjustmentDto.quantity),
      reason: this.normalizeRequiredString(
        createAdjustmentDto.reason,
        'Stock adjustment reason is required.',
      ),
      requestedByUserId: currentUser.sub,
    });

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'inventory.stock.adjustment.requested',
      entityType: 'StockAdjustment',
      entityId: adjustment.id.toString(),
      metadata: {
        adjustmentNumber,
        itemId: item.id,
        locationId: location.id,
        quantity: adjustment.quantity.toFixed(2),
        reason: adjustment.reason,
      },
    });

    return this.serializeAdjustment(adjustment);
  }

  async listStockAdjustments(
    _currentUser: CurrentUserPayload,
    query: GetStockAdjustmentsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [total, adjustments] =
      await this.stockAdjustmentsRepository.listAdjustments({
        skip: (page - 1) * limit,
        take: limit,
        search: this.normalizeOptionalString(query.search) ?? undefined,
        status: query.status,
        itemId: query.itemId,
        locationId: query.locationId,
      });

    return {
      items: adjustments.map((adjustment) =>
        this.serializeAdjustment(adjustment),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStockAdjustmentById(
    _currentUser: CurrentUserPayload,
    adjustmentId: number,
  ) {
    return this.serializeAdjustment(
      await this.findRequiredAdjustment(adjustmentId),
    );
  }

  async approveStockAdjustment(
    currentUser: CurrentUserPayload,
    adjustmentId: number,
    approveAdjustmentDto: ApproveStockAdjustmentDto,
  ) {
    const adjustment = await this.findRequiredAdjustment(adjustmentId);
    this.assertPendingAdjustment(adjustment);

    const movementNumber = await this.generateMovementNumber();
    const result = await this.stockAdjustmentsRepository.approveAdjustment({
      adjustmentId: adjustment.id,
      movementNumber,
      approvedByUserId: currentUser.sub,
      decisionNote: this.normalizeOptionalString(
        approveAdjustmentDto.decisionNote,
      ),
    });

    if (result.status === 'INACTIVE') {
      throw new ConflictException(
        'Inventory item or location became inactive before adjustment approval.',
      );
    }

    if (result.status === 'INSUFFICIENT') {
      throw new ConflictException(
        `Insufficient stock. Available quantity is ${result.availableQuantity.toFixed(2)}.`,
      );
    }

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'inventory.stock.adjustment.approved',
      entityType: 'StockAdjustment',
      entityId: result.adjustment.id.toString(),
      metadata: {
        adjustmentNumber: result.adjustment.adjustmentNumber,
        movementNumber,
        itemId: result.adjustment.itemId,
        locationId: result.adjustment.locationId,
        quantity: result.adjustment.quantity.toFixed(2),
        balanceQuantity: result.balance.quantity.toFixed(2),
      },
    });

    return {
      adjustment: this.serializeAdjustment(result.adjustment),
      balance: this.serializeBalance(result.balance),
      movement: this.serializeMovement(result.movement),
    };
  }

  async rejectStockAdjustment(
    currentUser: CurrentUserPayload,
    adjustmentId: number,
    rejectAdjustmentDto: RejectStockAdjustmentDto,
  ) {
    const adjustment = await this.findRequiredAdjustment(adjustmentId);
    this.assertPendingAdjustment(adjustment);

    const rejectedAdjustment =
      await this.stockAdjustmentsRepository.rejectAdjustment(adjustment.id, {
        status: StockAdjustmentStatus.REJECTED,
        rejectedByUserId: currentUser.sub,
        decidedAt: new Date(),
        decisionNote: this.normalizeRequiredString(
          rejectAdjustmentDto.decisionNote,
          'Stock adjustment rejection reason is required.',
        ),
      });

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'inventory.stock.adjustment.rejected',
      entityType: 'StockAdjustment',
      entityId: rejectedAdjustment.id.toString(),
      metadata: {
        adjustmentNumber: rejectedAdjustment.adjustmentNumber,
        decisionNote: rejectedAdjustment.decisionNote,
      },
    });

    return this.serializeAdjustment(rejectedAdjustment);
  }

  async cancelStockAdjustment(
    currentUser: CurrentUserPayload,
    adjustmentId: number,
    cancelAdjustmentDto: CancelStockAdjustmentDto,
  ) {
    const adjustment = await this.findRequiredAdjustment(adjustmentId);
    this.assertPendingAdjustment(adjustment);

    const cancelledAdjustment =
      await this.stockAdjustmentsRepository.cancelAdjustment(adjustment.id, {
        status: StockAdjustmentStatus.CANCELLED,
        rejectedByUserId: currentUser.sub,
        decidedAt: new Date(),
        decisionNote: this.normalizeRequiredString(
          cancelAdjustmentDto.decisionNote,
          'Stock adjustment cancellation reason is required.',
        ),
      });

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'inventory.stock.adjustment.cancelled',
      entityType: 'StockAdjustment',
      entityId: cancelledAdjustment.id.toString(),
      metadata: {
        adjustmentNumber: cancelledAdjustment.adjustmentNumber,
        decisionNote: cancelledAdjustment.decisionNote,
      },
    });

    return this.serializeAdjustment(cancelledAdjustment);
  }

  async createItem(
    currentUser: CurrentUserPayload,
    createItemDto: CreateInventoryItemDto,
  ) {
    const itemNumber = this.normalizeItemNumber(createItemDto.itemNumber);
    const duplicate =
      await this.inventoryItemsRepository.findItemByNumber(itemNumber);

    if (duplicate) {
      throw new ConflictException('Inventory item number already exists.');
    }

    const item = await this.inventoryItemsRepository.createItem({
      itemNumber,
      name: this.normalizeRequiredString(
        createItemDto.name,
        'Inventory item name is required.',
      ),
      type: createItemDto.type,
      category: this.normalizeOptionalString(createItemDto.category),
      unitOfMeasure: this.normalizeRequiredString(
        createItemDto.unitOfMeasure,
        'Unit of measure is required.',
      ),
      reorderLevel: this.toNullableDecimal(createItemDto.reorderLevel),
      reorderQuantity: this.toNullableDecimal(createItemDto.reorderQuantity),
      averageCost: this.toNullableDecimal(createItemDto.averageCost),
      status: createItemDto.status ?? InventoryItemStatus.ACTIVE,
      description: this.normalizeOptionalString(createItemDto.description),
    });

    await this.recordItemAudit(
      currentUser,
      'inventory.items.created',
      item,
      this.itemAuditSnapshot(item),
    );

    return this.serializeItem(item);
  }

  async listItems(
    _currentUser: CurrentUserPayload,
    query: GetInventoryItemsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [total, items] = await this.inventoryItemsRepository.listItems({
      skip: (page - 1) * limit,
      take: limit,
      search: this.normalizeOptionalString(query.search) ?? undefined,
      status: query.status,
      type: query.type,
      category: this.normalizeOptionalString(query.category) ?? undefined,
    });

    return {
      items: items.map((item) => this.serializeItem(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getItemById(_currentUser: CurrentUserPayload, itemId: number) {
    return this.serializeItem(await this.findRequiredItem(itemId));
  }

  async updateItem(
    currentUser: CurrentUserPayload,
    itemId: number,
    updateItemDto: UpdateInventoryItemDto,
  ) {
    const item = await this.findRequiredItem(itemId);
    const data: Prisma.InventoryItemUncheckedUpdateInput = {};

    if (updateItemDto.itemNumber !== undefined) {
      const itemNumber = this.normalizeItemNumber(updateItemDto.itemNumber);

      if (itemNumber !== item.itemNumber) {
        const duplicate = await this.inventoryItemsRepository.findItemByNumber(
          itemNumber,
          item.id,
        );

        if (duplicate) {
          throw new ConflictException('Inventory item number already exists.');
        }
      }

      data.itemNumber = itemNumber;
    }

    if (updateItemDto.name !== undefined) {
      data.name = this.normalizeRequiredString(
        updateItemDto.name,
        'Inventory item name is required.',
      );
    }

    if (updateItemDto.type !== undefined) {
      data.type = updateItemDto.type;
    }

    if (updateItemDto.category !== undefined) {
      data.category = this.normalizeOptionalString(updateItemDto.category);
    }

    if (updateItemDto.unitOfMeasure !== undefined) {
      data.unitOfMeasure = this.normalizeRequiredString(
        updateItemDto.unitOfMeasure,
        'Unit of measure is required.',
      );
    }

    if (updateItemDto.reorderLevel !== undefined) {
      data.reorderLevel = this.toNullableDecimal(updateItemDto.reorderLevel);
    }

    if (updateItemDto.reorderQuantity !== undefined) {
      data.reorderQuantity = this.toNullableDecimal(
        updateItemDto.reorderQuantity,
      );
    }

    if (updateItemDto.averageCost !== undefined) {
      data.averageCost = this.toNullableDecimal(updateItemDto.averageCost);
    }

    if (updateItemDto.status !== undefined) {
      data.status = updateItemDto.status;
    }

    if (updateItemDto.description !== undefined) {
      data.description = this.normalizeOptionalString(
        updateItemDto.description,
      );
    }

    if (Object.keys(data).length === 0) {
      return this.serializeItem(item);
    }

    const updatedItem = await this.inventoryItemsRepository.updateItem(
      item.id,
      data,
    );

    await this.recordItemAudit(
      currentUser,
      'inventory.items.updated',
      updatedItem,
      {
        previous: this.itemAuditSnapshot(item),
        current: this.itemAuditSnapshot(updatedItem),
      },
    );

    return this.serializeItem(updatedItem);
  }

  async deactivateItem(currentUser: CurrentUserPayload, itemId: number) {
    const item = await this.findRequiredItem(itemId);

    if (item.status === InventoryItemStatus.INACTIVE) {
      return this.serializeItem(item);
    }

    const updatedItem = await this.inventoryItemsRepository.updateItem(
      item.id,
      {
        status: InventoryItemStatus.INACTIVE,
      },
    );

    await this.recordItemAudit(
      currentUser,
      'inventory.items.deactivated',
      updatedItem,
      {
        previousStatus: item.status,
        status: updatedItem.status,
      },
    );

    return this.serializeItem(updatedItem);
  }

  async createLocation(
    currentUser: CurrentUserPayload,
    createLocationDto: CreateInventoryLocationDto,
  ) {
    const code = this.normalizeCode(createLocationDto.code);
    const duplicate =
      await this.inventoryLocationsRepository.findLocationByCode(code);

    if (duplicate) {
      throw new ConflictException('Inventory location code already exists.');
    }

    const location = await this.inventoryLocationsRepository.createLocation({
      name: this.normalizeRequiredString(
        createLocationDto.name,
        'Inventory location name is required.',
      ),
      code,
      description: this.normalizeOptionalString(createLocationDto.description),
    });

    await this.recordLocationAudit(
      currentUser,
      'inventory.locations.created',
      location,
      this.locationAuditSnapshot(location),
    );

    return location;
  }

  async listLocations(
    _currentUser: CurrentUserPayload,
    query: GetInventoryLocationsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [total, locations] =
      await this.inventoryLocationsRepository.listLocations({
        skip: (page - 1) * limit,
        take: limit,
        search: this.normalizeOptionalString(query.search) ?? undefined,
        isActive: query.isActive,
      });

    return {
      items: locations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLocationById(_currentUser: CurrentUserPayload, locationId: number) {
    return this.findRequiredLocation(locationId);
  }

  async updateLocation(
    currentUser: CurrentUserPayload,
    locationId: number,
    updateLocationDto: UpdateInventoryLocationDto,
  ) {
    const location = await this.findRequiredLocation(locationId);
    const data: Prisma.InventoryLocationUncheckedUpdateInput = {};

    if (updateLocationDto.name !== undefined) {
      data.name = this.normalizeRequiredString(
        updateLocationDto.name,
        'Inventory location name is required.',
      );
    }

    if (updateLocationDto.code !== undefined) {
      const code = this.normalizeCode(updateLocationDto.code);

      if (code !== location.code) {
        const duplicate =
          await this.inventoryLocationsRepository.findLocationByCode(
            code,
            location.id,
          );

        if (duplicate) {
          throw new ConflictException(
            'Inventory location code already exists.',
          );
        }
      }

      data.code = code;
    }

    if (updateLocationDto.description !== undefined) {
      data.description = this.normalizeOptionalString(
        updateLocationDto.description,
      );
    }

    if (updateLocationDto.isActive !== undefined) {
      data.isActive = updateLocationDto.isActive;
    }

    if (Object.keys(data).length === 0) {
      return location;
    }

    const updatedLocation =
      await this.inventoryLocationsRepository.updateLocation(location.id, data);

    await this.recordLocationAudit(
      currentUser,
      'inventory.locations.updated',
      updatedLocation,
      {
        previous: this.locationAuditSnapshot(location),
        current: this.locationAuditSnapshot(updatedLocation),
      },
    );

    return updatedLocation;
  }

  async deactivateLocation(
    currentUser: CurrentUserPayload,
    locationId: number,
  ) {
    const location = await this.findRequiredLocation(locationId);

    if (!location.isActive) {
      return location;
    }

    const updatedLocation =
      await this.inventoryLocationsRepository.updateLocation(location.id, {
        isActive: false,
      });

    await this.recordLocationAudit(
      currentUser,
      'inventory.locations.deactivated',
      updatedLocation,
      {
        previousIsActive: location.isActive,
        isActive: updatedLocation.isActive,
      },
    );

    return updatedLocation;
  }

  private async findRequiredLocation(locationId: number) {
    const location =
      await this.inventoryLocationsRepository.findLocation(locationId);

    if (!location) {
      throw new NotFoundException('Inventory location was not found.');
    }

    return location;
  }

  private async findRequiredItem(itemId: number) {
    const item = await this.inventoryItemsRepository.findItem(itemId);

    if (!item) {
      throw new NotFoundException('Inventory item was not found.');
    }

    return item;
  }

  private async findRequiredAdjustment(adjustmentId: number) {
    const adjustment =
      await this.stockAdjustmentsRepository.findAdjustment(adjustmentId);

    if (!adjustment) {
      throw new NotFoundException('Stock adjustment was not found.');
    }

    return adjustment;
  }

  private assertPendingAdjustment(adjustment: StockAdjustmentRecord) {
    if (adjustment.status !== StockAdjustmentStatus.PENDING) {
      throw new ConflictException(
        'Only pending stock adjustments can be decided.',
      );
    }
  }

  private normalizeItemNumber(value: string) {
    return this.normalizeRequiredString(
      value,
      'Inventory item number is required.',
    ).toUpperCase();
  }

  private normalizeCode(value: string) {
    return this.normalizeRequiredString(
      value,
      'Inventory location code is required.',
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

  private toNullableDecimal(value?: number | null) {
    return value === null || value === undefined
      ? null
      : new Prisma.Decimal(value);
  }

  private serializeItem(item: InventoryItemRecord) {
    return {
      ...item,
      reorderLevel: item.reorderLevel?.toFixed(2) ?? null,
      reorderQuantity: item.reorderQuantity?.toFixed(2) ?? null,
      averageCost: item.averageCost?.toFixed(2) ?? null,
    };
  }

  private serializeBalance(balance: StockBalanceRecord) {
    return {
      ...balance,
      quantity: balance.quantity.toFixed(2),
      item: {
        ...balance.item,
        averageCost: balance.item.averageCost?.toFixed(2) ?? null,
      },
    };
  }

  private serializeMovement(movement: StockMovementRecord) {
    return {
      ...movement,
      quantity: movement.quantity.toFixed(2),
      unitCost: movement.unitCost?.toFixed(2) ?? null,
      totalCost: movement.totalCost?.toFixed(2) ?? null,
    };
  }

  private serializeDashboardMovement(movement: DashboardMovementRecord) {
    return {
      ...movement,
      quantity: movement.quantity.toFixed(2),
      unitCost: movement.unitCost?.toFixed(2) ?? null,
      totalCost: movement.totalCost?.toFixed(2) ?? null,
    };
  }

  private toReorderAlert(item: ReorderAlertItemRecord, locationId?: number) {
    const totalQuantity = item.balances.reduce(
      (total, balance) => total.add(balance.quantity),
      new Prisma.Decimal(0),
    );

    if (!item.reorderLevel || totalQuantity.greaterThan(item.reorderLevel)) {
      return null;
    }

    return {
      item: {
        id: item.id,
        itemNumber: item.itemNumber,
        name: item.name,
        type: item.type,
        category: item.category,
        unitOfMeasure: item.unitOfMeasure,
        averageCost: item.averageCost?.toFixed(2) ?? null,
      },
      locationId: locationId ?? null,
      currentQuantity: totalQuantity.toFixed(2),
      reorderLevel: item.reorderLevel.toFixed(2),
      reorderQuantity: item.reorderQuantity?.toFixed(2) ?? null,
      locations: item.balances.map((balance) => ({
        ...balance.location,
        quantity: balance.quantity.toFixed(2),
      })),
    };
  }

  private serializeAdjustment(adjustment: StockAdjustmentRecord) {
    return {
      ...adjustment,
      quantity: adjustment.quantity.toFixed(2),
      item: {
        ...adjustment.item,
        averageCost: adjustment.item.averageCost?.toFixed(2) ?? null,
      },
    };
  }

  private itemAuditSnapshot(item: InventoryItemRecord) {
    return {
      itemNumber: item.itemNumber,
      name: item.name,
      type: item.type,
      category: item.category,
      unitOfMeasure: item.unitOfMeasure,
      reorderLevel: item.reorderLevel?.toFixed(2) ?? null,
      reorderQuantity: item.reorderQuantity?.toFixed(2) ?? null,
      averageCost: item.averageCost?.toFixed(2) ?? null,
      status: item.status,
      description: item.description,
    };
  }

  private locationAuditSnapshot(location: InventoryLocationRecord) {
    return {
      name: location.name,
      code: location.code,
      description: location.description,
      isActive: location.isActive,
    };
  }

  private recordLocationAudit(
    currentUser: CurrentUserPayload,
    action: string,
    location: InventoryLocationRecord,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'InventoryLocation',
      entityId: location.id.toString(),
      metadata,
    });
  }

  private recordItemAudit(
    currentUser: CurrentUserPayload,
    action: string,
    item: InventoryItemRecord,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'InventoryItem',
      entityId: item.id.toString(),
      metadata,
    });
  }

  private async generateMovementNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replaceAll('-', '');

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const sequence = `${Date.now().toString().slice(-6)}${attempt}`.slice(-6);
      const movementNumber = `MOV-${datePart}-${sequence}`;
      const existing =
        await this.stockMovementsRepository.findByMovementNumber(
          movementNumber,
        );

      if (!existing) {
        return movementNumber;
      }
    }

    throw new ConflictException('Unable to generate a unique movement number.');
  }

  private async generateAdjustmentNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replaceAll('-', '');

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const sequence = `${Date.now().toString().slice(-6)}${attempt}`.slice(-6);
      const adjustmentNumber = `ADJ-${datePart}-${sequence}`;
      const existing =
        await this.stockAdjustmentsRepository.findByAdjustmentNumber(
          adjustmentNumber,
        );

      if (!existing) {
        return adjustmentNumber;
      }
    }

    throw new ConflictException(
      'Unable to generate a unique adjustment number.',
    );
  }
}
