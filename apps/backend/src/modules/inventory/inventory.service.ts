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

@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryLocationsRepository: InventoryLocationsRepository,
    private readonly inventoryItemsRepository: InventoryItemsRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

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
}
