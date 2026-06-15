import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InventoryItemStatus, Prisma } from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateInventoryLocationDto } from './dto/create-inventory-location.dto';
import { GetInventoryItemsQueryDto } from './dto/get-inventory-items-query.dto';
import { GetInventoryLocationsQueryDto } from './dto/get-inventory-locations-query.dto';
import { GetStockBalancesQueryDto } from './dto/get-stock-balances-query.dto';
import { GetStockMovementsQueryDto } from './dto/get-stock-movements-query.dto';
import { IssueStockDto } from './dto/issue-stock.dto';
import { ReceiveStockDto } from './dto/receive-stock.dto';
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
  StockBalanceRecord,
  StockBalancesRepository,
} from './repositories/stock-balances.repository';
import { StockIssuesRepository } from './repositories/stock-issues.repository';
import {
  StockMovementRecord,
  StockMovementsRepository,
} from './repositories/stock-movements.repository';
import { StockReceiptsRepository } from './repositories/stock-receipts.repository';

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryLocationsRepository: InventoryLocationsRepository,
    private readonly inventoryItemsRepository: InventoryItemsRepository,
    private readonly stockBalancesRepository: StockBalancesRepository,
    private readonly stockMovementsRepository: StockMovementsRepository,
    private readonly stockReceiptsRepository: StockReceiptsRepository,
    private readonly stockIssuesRepository: StockIssuesRepository,
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
}
