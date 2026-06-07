import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  MenuItemStatus,
  PosOrderSource,
  PosOrderStatus,
  Prisma,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { CreatePosOrderDto } from './dto/create-pos-order.dto';
import { GetMenuItemsQueryDto } from './dto/get-menu-items-query.dto';
import { GetOutletsQueryDto } from './dto/get-outlets-query.dto';
import { GetPosOrdersQueryDto } from './dto/get-pos-orders-query.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { UpdatePosOrderDto } from './dto/update-pos-order.dto';
import {
  MenuItemRecord,
  MenuItemsRepository,
} from './repositories/menu-items.repository';
import {
  OutletRecord,
  OutletsRepository,
} from './repositories/outlets.repository';
import {
  PosOrderRecord,
  PosOrdersRepository,
} from './repositories/pos-orders.repository';

@Injectable()
export class RestaurantService {
  constructor(
    private readonly outletsRepository: OutletsRepository,
    private readonly menuItemsRepository: MenuItemsRepository,
    private readonly posOrdersRepository: PosOrdersRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async createOutlet(
    currentUser: CurrentUserPayload,
    createOutletDto: CreateOutletDto,
  ) {
    const code = this.normalizeCode(createOutletDto.code);
    const existingOutlet = await this.outletsRepository.findByCode(code);

    if (existingOutlet) {
      throw new ConflictException('Outlet code already exists.');
    }

    const outlet = await this.outletsRepository.createOutlet({
      name: this.normalizeRequiredString(
        createOutletDto.name,
        'Outlet name is required.',
      ),
      code,
      type: createOutletDto.type,
      description: this.normalizeOptionalString(createOutletDto.description),
    });

    await this.recordOutletAudit(
      currentUser,
      'restaurant.outlets.created',
      outlet,
      {
        name: outlet.name,
        code: outlet.code,
        type: outlet.type,
      },
    );

    return this.serializeOutlet(outlet);
  }

  async listOutlets(
    _currentUser: CurrentUserPayload,
    query: GetOutletsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [total, outlets] = await this.outletsRepository.listOutlets({
      skip: (page - 1) * limit,
      take: limit,
      search: this.normalizeOptionalString(query.search) ?? undefined,
      type: query.type,
      isActive: query.isActive,
    });

    return {
      items: outlets.map((outlet) => this.serializeOutlet(outlet)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOutletById(_currentUser: CurrentUserPayload, outletId: number) {
    return this.serializeOutlet(await this.findRequiredOutlet(outletId));
  }

  async updateOutlet(
    currentUser: CurrentUserPayload,
    outletId: number,
    updateOutletDto: UpdateOutletDto,
  ) {
    const outlet = await this.findRequiredOutlet(outletId);
    const data: Prisma.OutletUncheckedUpdateInput = {};

    if (updateOutletDto.name !== undefined) {
      data.name = this.normalizeRequiredString(
        updateOutletDto.name,
        'Outlet name is required.',
      );
    }

    if (updateOutletDto.code !== undefined) {
      const code = this.normalizeCode(updateOutletDto.code);

      if (code !== outlet.code) {
        const duplicateOutlet = await this.outletsRepository.findByCode(
          code,
          outlet.id,
        );

        if (duplicateOutlet) {
          throw new ConflictException('Outlet code already exists.');
        }
      }

      data.code = code;
    }

    if (updateOutletDto.type !== undefined) {
      data.type = updateOutletDto.type;
    }

    if (updateOutletDto.description !== undefined) {
      data.description = this.normalizeOptionalString(
        updateOutletDto.description,
      );
    }

    if (updateOutletDto.isActive !== undefined) {
      data.isActive = updateOutletDto.isActive;
    }

    if (Object.keys(data).length === 0) {
      return this.serializeOutlet(outlet);
    }

    const updatedOutlet = await this.outletsRepository.updateOutlet(
      outlet.id,
      data,
    );

    await this.recordOutletAudit(
      currentUser,
      'restaurant.outlets.updated',
      updatedOutlet,
      {
        previous: this.outletAuditSnapshot(outlet),
        current: this.outletAuditSnapshot(updatedOutlet),
      },
    );

    return this.serializeOutlet(updatedOutlet);
  }

  async deactivateOutlet(currentUser: CurrentUserPayload, outletId: number) {
    const outlet = await this.findRequiredOutlet(outletId);

    if (!outlet.isActive) {
      return this.serializeOutlet(outlet);
    }

    const updatedOutlet = await this.outletsRepository.updateOutlet(outlet.id, {
      isActive: false,
    });

    await this.recordOutletAudit(
      currentUser,
      'restaurant.outlets.deactivated',
      updatedOutlet,
      {
        previousIsActive: outlet.isActive,
        isActive: updatedOutlet.isActive,
      },
    );

    return this.serializeOutlet(updatedOutlet);
  }

  async createMenuItem(
    currentUser: CurrentUserPayload,
    createMenuItemDto: CreateMenuItemDto,
  ) {
    const outlet = await this.findRequiredOutlet(createMenuItemDto.outletId);
    this.ensureOutletIsActive(outlet);

    const code = this.normalizeMenuItemCode(createMenuItemDto.code);
    const existingMenuItem = await this.menuItemsRepository.findByOutletAndCode(
      outlet.id,
      code,
    );

    if (existingMenuItem) {
      throw new ConflictException(
        'Menu item code already exists for this outlet.',
      );
    }

    const menuItem = await this.menuItemsRepository.createMenuItem({
      outletId: outlet.id,
      name: this.normalizeRequiredString(
        createMenuItemDto.name,
        'Menu item name is required.',
      ),
      code,
      category: this.normalizeOptionalString(createMenuItemDto.category),
      description: this.normalizeOptionalString(createMenuItemDto.description),
      price: new Prisma.Decimal(createMenuItemDto.price),
      status: createMenuItemDto.status ?? MenuItemStatus.ACTIVE,
    });

    await this.recordMenuItemAudit(
      currentUser,
      'restaurant.menu_items.created',
      menuItem,
      this.menuItemAuditSnapshot(menuItem),
    );

    return this.serializeMenuItem(menuItem);
  }

  async listMenuItems(
    _currentUser: CurrentUserPayload,
    query: GetMenuItemsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [total, menuItems] = await this.menuItemsRepository.listMenuItems({
      skip: (page - 1) * limit,
      take: limit,
      search: this.normalizeOptionalString(query.search) ?? undefined,
      outletId: query.outletId,
      status: query.status,
      category: this.normalizeOptionalString(query.category) ?? undefined,
    });

    return {
      items: menuItems.map((menuItem) => this.serializeMenuItem(menuItem)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMenuItemById(_currentUser: CurrentUserPayload, menuItemId: number) {
    return this.serializeMenuItem(await this.findRequiredMenuItem(menuItemId));
  }

  async updateMenuItem(
    currentUser: CurrentUserPayload,
    menuItemId: number,
    updateMenuItemDto: UpdateMenuItemDto,
  ) {
    const menuItem = await this.findRequiredMenuItem(menuItemId);
    const targetOutletId = updateMenuItemDto.outletId ?? menuItem.outletId;
    const targetCode =
      updateMenuItemDto.code === undefined
        ? menuItem.code
        : this.normalizeMenuItemCode(updateMenuItemDto.code);

    if (
      targetOutletId !== menuItem.outletId ||
      updateMenuItemDto.status === MenuItemStatus.ACTIVE
    ) {
      const targetOutlet = await this.findRequiredOutlet(targetOutletId);
      this.ensureOutletIsActive(targetOutlet);
    }

    if (targetOutletId !== menuItem.outletId || targetCode !== menuItem.code) {
      const duplicate = await this.menuItemsRepository.findByOutletAndCode(
        targetOutletId,
        targetCode,
        menuItem.id,
      );

      if (duplicate) {
        throw new ConflictException(
          'Menu item code already exists for this outlet.',
        );
      }
    }

    const data: Prisma.MenuItemUncheckedUpdateInput = {};

    if (updateMenuItemDto.outletId !== undefined) {
      data.outletId = updateMenuItemDto.outletId;
    }

    if (updateMenuItemDto.name !== undefined) {
      data.name = this.normalizeRequiredString(
        updateMenuItemDto.name,
        'Menu item name is required.',
      );
    }

    if (updateMenuItemDto.code !== undefined) {
      data.code = targetCode;
    }

    if (updateMenuItemDto.category !== undefined) {
      data.category = this.normalizeOptionalString(updateMenuItemDto.category);
    }

    if (updateMenuItemDto.description !== undefined) {
      data.description = this.normalizeOptionalString(
        updateMenuItemDto.description,
      );
    }

    if (updateMenuItemDto.price !== undefined) {
      data.price = new Prisma.Decimal(updateMenuItemDto.price);
    }

    if (updateMenuItemDto.status !== undefined) {
      data.status = updateMenuItemDto.status;
    }

    if (Object.keys(data).length === 0) {
      return this.serializeMenuItem(menuItem);
    }

    const updatedMenuItem = await this.menuItemsRepository.updateMenuItem(
      menuItem.id,
      data,
    );

    await this.recordMenuItemAudit(
      currentUser,
      'restaurant.menu_items.updated',
      updatedMenuItem,
      {
        previous: this.menuItemAuditSnapshot(menuItem),
        current: this.menuItemAuditSnapshot(updatedMenuItem),
      },
    );

    return this.serializeMenuItem(updatedMenuItem);
  }

  async deactivateMenuItem(
    currentUser: CurrentUserPayload,
    menuItemId: number,
  ) {
    const menuItem = await this.findRequiredMenuItem(menuItemId);

    if (menuItem.status === MenuItemStatus.INACTIVE) {
      return this.serializeMenuItem(menuItem);
    }

    const updatedMenuItem = await this.menuItemsRepository.updateMenuItem(
      menuItem.id,
      {
        status: MenuItemStatus.INACTIVE,
      },
    );

    await this.recordMenuItemAudit(
      currentUser,
      'restaurant.menu_items.deactivated',
      updatedMenuItem,
      {
        previousStatus: menuItem.status,
        status: updatedMenuItem.status,
      },
    );

    return this.serializeMenuItem(updatedMenuItem);
  }

  async markMenuItemOutOfStock(
    currentUser: CurrentUserPayload,
    menuItemId: number,
  ) {
    return this.changeMenuItemStatus(
      currentUser,
      menuItemId,
      MenuItemStatus.OUT_OF_STOCK,
      'restaurant.menu_items.marked_out_of_stock',
    );
  }

  async markMenuItemActive(
    currentUser: CurrentUserPayload,
    menuItemId: number,
  ) {
    const menuItem = await this.findRequiredMenuItem(menuItemId);
    const outlet = await this.findRequiredOutlet(menuItem.outletId);
    this.ensureOutletIsActive(outlet);

    return this.changeMenuItemStatus(
      currentUser,
      menuItem.id,
      MenuItemStatus.ACTIVE,
      'restaurant.menu_items.marked_active',
      menuItem,
    );
  }

  async createOrder(
    currentUser: CurrentUserPayload,
    createPosOrderDto: CreatePosOrderDto,
  ) {
    const outlet = await this.findRequiredOutlet(createPosOrderDto.outletId);
    this.ensureOutletIsActive(outlet);

    const order = await this.posOrdersRepository.createOrder({
      orderNumber: await this.generateOrderNumber(),
      outletId: outlet.id,
      source: createPosOrderDto.source ?? PosOrderSource.MANUAL,
      tableNumber: this.normalizeOptionalString(createPosOrderDto.tableNumber),
      notes: this.normalizeOptionalString(createPosOrderDto.notes),
      createdByUserId: currentUser.sub,
    });

    await this.recordOrderAudit(
      currentUser,
      'restaurant.orders.created',
      order,
      {
        orderNumber: order.orderNumber,
        outletId: order.outletId,
        source: order.source,
        tableNumber: order.tableNumber,
      },
    );

    return this.serializeOrder(order);
  }

  async listOrders(
    _currentUser: CurrentUserPayload,
    query: GetPosOrdersQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [total, orders] = await this.posOrdersRepository.listOrders({
      skip: (page - 1) * limit,
      take: limit,
      search: this.normalizeOptionalString(query.search) ?? undefined,
      outletId: query.outletId,
      status: query.status,
      paymentStatus: query.paymentStatus,
      source: query.source,
      createdFrom: this.parseOptionalDate(query.createdFrom),
      createdTo: this.parseOptionalDate(query.createdTo),
    });

    return {
      items: orders.map((order) => this.serializeOrder(order)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(_currentUser: CurrentUserPayload, orderId: number) {
    return this.serializeOrder(await this.findRequiredOrder(orderId));
  }

  async updateOrder(
    currentUser: CurrentUserPayload,
    orderId: number,
    updatePosOrderDto: UpdatePosOrderDto,
  ) {
    const order = await this.findRequiredOrder(orderId);

    if (order.status !== PosOrderStatus.OPEN) {
      throw new ConflictException('Only open POS orders can be updated.');
    }

    const data: Prisma.PosOrderUncheckedUpdateInput = {};

    if (updatePosOrderDto.source !== undefined) {
      data.source = updatePosOrderDto.source;
    }

    if (updatePosOrderDto.tableNumber !== undefined) {
      data.tableNumber = this.normalizeOptionalString(
        updatePosOrderDto.tableNumber,
      );
    }

    if (updatePosOrderDto.notes !== undefined) {
      data.notes = this.normalizeOptionalString(updatePosOrderDto.notes);
    }

    if (Object.keys(data).length === 0) {
      return this.serializeOrder(order);
    }

    const updatedOrder = await this.posOrdersRepository.updateOrder(
      order.id,
      data,
    );

    await this.recordOrderAudit(
      currentUser,
      'restaurant.orders.updated',
      updatedOrder,
      {
        previous: this.orderMetadataAuditSnapshot(order),
        current: this.orderMetadataAuditSnapshot(updatedOrder),
      },
    );

    return this.serializeOrder(updatedOrder);
  }

  private async findRequiredOutlet(outletId: number) {
    const outlet = await this.outletsRepository.findOutlet(outletId);

    if (!outlet) {
      throw new NotFoundException('Outlet was not found.');
    }

    return outlet;
  }

  private async findRequiredMenuItem(menuItemId: number) {
    const menuItem = await this.menuItemsRepository.findMenuItem(menuItemId);

    if (!menuItem) {
      throw new NotFoundException('Menu item was not found.');
    }

    return menuItem;
  }

  private async findRequiredOrder(orderId: number) {
    const order = await this.posOrdersRepository.findOrder(orderId);

    if (!order) {
      throw new NotFoundException('POS order was not found.');
    }

    return order;
  }

  private ensureOutletIsActive(outlet: OutletRecord) {
    if (!outlet.isActive) {
      throw new ConflictException('Outlet is inactive.');
    }
  }

  private async changeMenuItemStatus(
    currentUser: CurrentUserPayload,
    menuItemId: number,
    status: MenuItemStatus,
    action: string,
    existingMenuItem?: MenuItemRecord,
  ) {
    const menuItem =
      existingMenuItem ?? (await this.findRequiredMenuItem(menuItemId));

    if (menuItem.status === status) {
      return this.serializeMenuItem(menuItem);
    }

    const updatedMenuItem = await this.menuItemsRepository.updateMenuItem(
      menuItem.id,
      { status },
    );

    await this.recordMenuItemAudit(currentUser, action, updatedMenuItem, {
      previousStatus: menuItem.status,
      status: updatedMenuItem.status,
    });

    return this.serializeMenuItem(updatedMenuItem);
  }

  private serializeOutlet(outlet: OutletRecord) {
    return {
      id: outlet.id,
      name: outlet.name,
      code: outlet.code,
      type: outlet.type,
      description: outlet.description,
      isActive: outlet.isActive,
      createdAt: outlet.createdAt,
      updatedAt: outlet.updatedAt,
    };
  }

  private serializeMenuItem(menuItem: MenuItemRecord) {
    return {
      id: menuItem.id,
      outletId: menuItem.outletId,
      name: menuItem.name,
      code: menuItem.code,
      category: menuItem.category,
      description: menuItem.description,
      price: this.serializeDecimal(menuItem.price),
      status: menuItem.status,
      createdAt: menuItem.createdAt,
      updatedAt: menuItem.updatedAt,
      outlet: menuItem.outlet,
    };
  }

  private serializeOrder(order: PosOrderRecord) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      outletId: order.outletId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      source: order.source,
      tableNumber: order.tableNumber,
      roomId: order.roomId,
      stayId: order.stayId,
      folioId: order.folioId,
      subtotalAmount: this.serializeDecimal(order.subtotalAmount),
      discountAmount: this.serializeDecimal(order.discountAmount),
      taxAmount: this.serializeDecimal(order.taxAmount),
      serviceAmount: this.serializeDecimal(order.serviceAmount),
      totalAmount: this.serializeDecimal(order.totalAmount),
      paidAmount: this.serializeDecimal(order.paidAmount),
      balanceAmount: this.serializeDecimal(order.balanceAmount),
      notes: order.notes,
      cancelledReason: order.cancelledReason,
      createdByUserId: order.createdByUserId,
      closedByUserId: order.closedByUserId,
      cancelledByUserId: order.cancelledByUserId,
      closedAt: order.closedAt,
      cancelledAt: order.cancelledAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      outlet: order.outlet,
      createdBy: order.createdBy,
      closedBy: order.closedBy,
      cancelledBy: order.cancelledBy,
      items: order.items.map((item) => ({
        ...item,
        unitPrice: this.serializeDecimal(item.unitPrice),
        totalAmount: this.serializeDecimal(item.totalAmount),
      })),
      payments: order.payments.map((payment) => ({
        ...payment,
        amount: this.serializeDecimal(payment.amount),
      })),
    };
  }

  private outletAuditSnapshot(outlet: OutletRecord): Prisma.InputJsonObject {
    return {
      name: outlet.name,
      code: outlet.code,
      type: outlet.type,
      description: outlet.description,
      isActive: outlet.isActive,
    };
  }

  private menuItemAuditSnapshot(
    menuItem: MenuItemRecord,
  ): Prisma.InputJsonObject {
    return {
      outletId: menuItem.outletId,
      name: menuItem.name,
      code: menuItem.code,
      category: menuItem.category,
      description: menuItem.description,
      price: this.serializeDecimal(menuItem.price),
      status: menuItem.status,
    };
  }

  private orderMetadataAuditSnapshot(
    order: PosOrderRecord,
  ): Prisma.InputJsonObject {
    return {
      source: order.source,
      tableNumber: order.tableNumber,
      notes: order.notes,
    };
  }

  private recordOutletAudit(
    currentUser: CurrentUserPayload,
    action: string,
    outlet: OutletRecord,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'Outlet',
      entityId: String(outlet.id),
      metadata,
    });
  }

  private recordMenuItemAudit(
    currentUser: CurrentUserPayload,
    action: string,
    menuItem: MenuItemRecord,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'MenuItem',
      entityId: String(menuItem.id),
      metadata,
    });
  }

  private recordOrderAudit(
    currentUser: CurrentUserPayload,
    action: string,
    order: PosOrderRecord,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'PosOrder',
      entityId: String(order.id),
      metadata,
    });
  }

  private async generateOrderNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const sequence = `${Date.now().toString().slice(-6)}${attempt}`.slice(-6);
      const orderNumber = `POS-${datePart}-${sequence}`;
      const existingOrder =
        await this.posOrdersRepository.findByOrderNumber(orderNumber);

      if (!existingOrder) {
        return orderNumber;
      }
    }

    throw new ConflictException(
      'Could not generate a unique POS order number.',
    );
  }

  private normalizeCode(value: string) {
    return this.normalizeRequiredString(
      value,
      'Outlet code is required.',
    ).toUpperCase();
  }

  private normalizeMenuItemCode(value: string) {
    return this.normalizeRequiredString(
      value,
      'Menu item code is required.',
    ).toUpperCase();
  }

  private parseOptionalDate(value?: string) {
    return value ? new Date(value) : undefined;
  }

  private serializeDecimal(value: Prisma.Decimal) {
    return value.toString();
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
}
