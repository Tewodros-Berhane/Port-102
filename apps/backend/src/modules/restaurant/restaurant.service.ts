import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  MenuItemStatus,
  FolioLineItemType,
  FolioStatus,
  PosOrderPaymentStatus,
  PosOrderSource,
  PosOrderStatus,
  PosPaymentMethod,
  Prisma,
  StayStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AddPosOrderItemDto } from './dto/add-pos-order-item.dto';
import { ChargePosOrderToRoomDto } from './dto/charge-pos-order-to-room.dto';
import { CancelPosOrderDto } from './dto/cancel-pos-order.dto';
import { ClosePosOrderDto } from './dto/close-pos-order.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { CreatePosOrderDto } from './dto/create-pos-order.dto';
import { GetMenuItemsQueryDto } from './dto/get-menu-items-query.dto';
import { GetOutletsQueryDto } from './dto/get-outlets-query.dto';
import { GetPosOrdersQueryDto } from './dto/get-pos-orders-query.dto';
import { InHouseGuestSearchQueryDto } from './dto/in-house-guest-search-query.dto';
import { RecordPosOrderPaymentDto } from './dto/record-pos-order-payment.dto';
import { RestaurantDashboardQueryDto } from './dto/restaurant-dashboard-query.dto';
import { RestaurantSalesSummaryQueryDto } from './dto/restaurant-sales-summary-query.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { UpdatePosOrderItemDto } from './dto/update-pos-order-item.dto';
import { UpdatePosOrderDto } from './dto/update-pos-order.dto';
import { VoidPosOrderItemDto } from './dto/void-pos-order-item.dto';
import {
  MenuItemRecord,
  MenuItemsRepository,
} from './repositories/menu-items.repository';
import {
  OutletRecord,
  OutletsRepository,
} from './repositories/outlets.repository';
import { PosOrderItemsRepository } from './repositories/pos-order-items.repository';
import {
  PosOrderPaymentRecord,
  PosOrderPaymentsRepository,
} from './repositories/pos-order-payments.repository';
import {
  PosOrderRecord,
  PosOrdersRepository,
} from './repositories/pos-orders.repository';
import {
  PosRoomChargeRecord,
  PosRoomChargesRepository,
} from './repositories/pos-room-charges.repository';
import {
  RestaurantReportFilters,
  RestaurantReportsRepository,
} from './repositories/restaurant-reports.repository';

@Injectable()
export class RestaurantService {
  constructor(
    private readonly outletsRepository: OutletsRepository,
    private readonly menuItemsRepository: MenuItemsRepository,
    private readonly posOrdersRepository: PosOrdersRepository,
    private readonly posOrderItemsRepository: PosOrderItemsRepository,
    private readonly posOrderPaymentsRepository: PosOrderPaymentsRepository,
    private readonly posRoomChargesRepository: PosRoomChargesRepository,
    private readonly restaurantReportsRepository: RestaurantReportsRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getDashboard(
    _currentUser: CurrentUserPayload,
    query: RestaurantDashboardQueryDto,
  ) {
    if (query.outletId !== undefined) {
      await this.findRequiredOutlet(query.outletId);
    }

    const filters = this.reportFilters(query, true);
    const [counts, summary] = await Promise.all([
      this.restaurantReportsRepository.getDashboardCounts(filters),
      this.restaurantReportsRepository.getSalesSummary(filters),
    ]);

    return {
      period: this.serializeReportPeriod(filters),
      outletId: filters.outletId ?? null,
      ...counts,
      totalOrders: summary.totalOrders,
      closedOrders: summary.closedOrders,
      cancelledOrders: summary.cancelledOrders,
      grossSales: this.serializeNullableDecimal(summary.grossSales),
      directPayments: this.serializeNullableDecimal(summary.directPayments),
      roomCharges: this.serializeNullableDecimal(summary.roomCharges),
      unpaidBalance: this.serializeNullableDecimal(summary.unpaidBalance),
    };
  }

  async getSalesSummary(
    _currentUser: CurrentUserPayload,
    query: RestaurantSalesSummaryQueryDto,
  ) {
    if (query.outletId !== undefined) {
      await this.findRequiredOutlet(query.outletId);
    }

    const filters = this.reportFilters(query);
    const summary =
      await this.restaurantReportsRepository.getSalesSummary(filters);

    return this.serializeSalesSummary(summary, filters);
  }

  async getOutletSalesSummary(
    _currentUser: CurrentUserPayload,
    outletId: number,
    query: RestaurantSalesSummaryQueryDto,
  ) {
    const outlet = await this.findRequiredOutlet(outletId);
    const filters = this.reportFilters({ ...query, outletId });
    const summary =
      await this.restaurantReportsRepository.getSalesSummary(filters);

    return {
      outlet: this.serializeOutlet(outlet),
      ...this.serializeSalesSummary(summary, filters),
    };
  }

  async searchInHouseGuests(
    _currentUser: CurrentUserPayload,
    query: InHouseGuestSearchQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [total, stays] =
      await this.restaurantReportsRepository.searchInHouseGuests({
        skip: (page - 1) * limit,
        take: limit,
        search: this.normalizeOptionalString(query.search) ?? undefined,
      });

    return {
      items: stays.map((stay) => ({
        id: stay.id,
        stayNumber: stay.stayNumber,
        expectedCheckOutDate: stay.expectedCheckOutDate,
        guest: stay.guest,
        roomAssignment: stay.roomAssignments[0] ?? null,
        folio: stay.folio
          ? {
              ...stay.folio,
              balanceAmount: this.serializeDecimal(stay.folio.balanceAmount),
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

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

  async addOrderItem(
    currentUser: CurrentUserPayload,
    orderId: number,
    addPosOrderItemDto: AddPosOrderItemDto,
  ) {
    const order = await this.findRequiredOrder(orderId);
    this.ensureOrderIsOpen(order);

    const menuItem = await this.findRequiredMenuItem(
      addPosOrderItemDto.menuItemId,
    );
    this.ensureMenuItemCanBeOrdered(menuItem, order);

    const quantity = addPosOrderItemDto.quantity ?? 1;
    const totalAmount = menuItem.price.mul(quantity);
    const result = await this.posOrdersRepository.runInTransaction(
      async (client) => {
        const item = await this.posOrderItemsRepository.createOrderItem(
          {
            orderId: order.id,
            menuItemId: menuItem.id,
            description: menuItem.name,
            quantity,
            unitPrice: menuItem.price,
            totalAmount,
            notes: this.normalizeOptionalString(addPosOrderItemDto.notes),
          },
          client,
        );
        const currentOrder = await this.posOrdersRepository.findOrder(
          order.id,
          client,
        );

        if (!currentOrder) {
          throw new NotFoundException('POS order was not found.');
        }

        return {
          item,
          order: await this.recalculateOrder(currentOrder, client),
        };
      },
    );

    await this.recordOrderAudit(
      currentUser,
      'restaurant.order_items.added',
      result.order,
      {
        itemId: result.item.id,
        menuItemId: result.item.menuItemId,
        quantity: result.item.quantity,
        unitPrice: this.serializeDecimal(result.item.unitPrice),
        totalAmount: this.serializeDecimal(result.item.totalAmount),
      },
    );

    return this.serializeOrder(result.order);
  }

  async updateOrderItem(
    currentUser: CurrentUserPayload,
    orderId: number,
    itemId: number,
    updatePosOrderItemDto: UpdatePosOrderItemDto,
  ) {
    const order = await this.findRequiredOrder(orderId);
    this.ensureOrderIsOpen(order);
    const item = await this.findRequiredOrderItem(order.id, itemId);

    if (item.isVoided) {
      throw new ConflictException('Voided POS order items cannot be updated.');
    }

    const quantity = updatePosOrderItemDto.quantity ?? item.quantity;
    const data: Prisma.PosOrderItemUncheckedUpdateInput = {};

    if (updatePosOrderItemDto.quantity !== undefined) {
      data.quantity = quantity;
      data.totalAmount = item.unitPrice.mul(quantity);
    }

    if (updatePosOrderItemDto.notes !== undefined) {
      data.notes = this.normalizeOptionalString(updatePosOrderItemDto.notes);
    }

    if (Object.keys(data).length === 0) {
      return this.serializeOrder(order);
    }

    const result = await this.posOrdersRepository.runInTransaction(
      async (client) => {
        const updatedItem = await this.posOrderItemsRepository.updateOrderItem(
          item.id,
          data,
          client,
        );
        const currentOrder = await this.posOrdersRepository.findOrder(
          order.id,
          client,
        );

        if (!currentOrder) {
          throw new NotFoundException('POS order was not found.');
        }

        return {
          item: updatedItem,
          order: await this.recalculateOrder(currentOrder, client),
        };
      },
    );

    await this.recordOrderAudit(
      currentUser,
      'restaurant.order_items.updated',
      result.order,
      {
        itemId: result.item.id,
        previousQuantity: item.quantity,
        quantity: result.item.quantity,
        totalAmount: this.serializeDecimal(result.item.totalAmount),
      },
    );

    return this.serializeOrder(result.order);
  }

  async voidOrderItem(
    currentUser: CurrentUserPayload,
    orderId: number,
    itemId: number,
    voidPosOrderItemDto: VoidPosOrderItemDto,
  ) {
    const order = await this.findRequiredOrder(orderId);
    this.ensureOrderIsOpen(order);
    const item = await this.findRequiredOrderItem(order.id, itemId);

    if (item.isVoided) {
      throw new ConflictException('POS order item is already voided.');
    }

    const reason = this.normalizeRequiredString(
      voidPosOrderItemDto.reason,
      'Void reason is required.',
    );
    const result = await this.posOrdersRepository.runInTransaction(
      async (client) => {
        const voidedItem = await this.posOrderItemsRepository.updateOrderItem(
          item.id,
          {
            isVoided: true,
            voidReason: reason,
          },
          client,
        );
        const currentOrder = await this.posOrdersRepository.findOrder(
          order.id,
          client,
        );

        if (!currentOrder) {
          throw new NotFoundException('POS order was not found.');
        }

        return {
          item: voidedItem,
          order: await this.recalculateOrder(currentOrder, client),
        };
      },
    );

    await this.recordOrderAudit(
      currentUser,
      'restaurant.order_items.voided',
      result.order,
      {
        itemId: result.item.id,
        reason,
        removedAmount: this.serializeDecimal(item.totalAmount),
      },
    );

    return this.serializeOrder(result.order);
  }

  async recordOrderPayment(
    currentUser: CurrentUserPayload,
    orderId: number,
    recordPosOrderPaymentDto: RecordPosOrderPaymentDto,
  ) {
    const order = await this.findRequiredOrder(orderId);
    this.ensureOrderIsOpen(order);

    if (recordPosOrderPaymentDto.method === PosPaymentMethod.ROOM_CHARGE) {
      throw new BadRequestException(
        'Use the charge-to-room workflow for room charges.',
      );
    }

    if (order.balanceAmount.lte(0)) {
      throw new ConflictException('POS order has no outstanding balance.');
    }

    const amount = new Prisma.Decimal(recordPosOrderPaymentDto.amount);

    if (amount.gt(order.balanceAmount)) {
      throw new BadRequestException(
        'Payment amount cannot exceed the POS order balance.',
      );
    }

    const paymentNumber = await this.generatePaymentNumber();
    const result = await this.posOrdersRepository.runInTransaction(
      async (client) => {
        const currentOrder = await this.posOrdersRepository.findOrder(
          order.id,
          client,
        );

        if (!currentOrder) {
          throw new NotFoundException('POS order was not found.');
        }

        this.ensureOrderIsOpen(currentOrder);

        if (currentOrder.balanceAmount.lte(0)) {
          throw new ConflictException('POS order has no outstanding balance.');
        }

        if (amount.gt(currentOrder.balanceAmount)) {
          throw new BadRequestException(
            'Payment amount cannot exceed the POS order balance.',
          );
        }

        const payment = await this.posOrderPaymentsRepository.createPayment(
          {
            paymentNumber,
            orderId: order.id,
            amount,
            method: recordPosOrderPaymentDto.method,
            reference: this.normalizeOptionalString(
              recordPosOrderPaymentDto.reference,
            ),
            notes: this.normalizeOptionalString(recordPosOrderPaymentDto.notes),
            recordedByUserId: currentUser.sub,
          },
          client,
        );
        const paidAmount = currentOrder.paidAmount.add(amount);
        const balanceAmount = currentOrder.balanceAmount.sub(amount);
        const updatedOrder = await this.posOrdersRepository.updateOrder(
          order.id,
          {
            paidAmount,
            balanceAmount,
            paymentStatus: balanceAmount.eq(0)
              ? PosOrderPaymentStatus.PAID
              : PosOrderPaymentStatus.PARTIALLY_PAID,
          },
          client,
        );

        return { payment, order: updatedOrder };
      },
    );

    await this.recordOrderAudit(
      currentUser,
      'restaurant.payments.recorded',
      result.order,
      {
        paymentId: result.payment.id,
        paymentNumber: result.payment.paymentNumber,
        amount: this.serializeDecimal(result.payment.amount),
        method: result.payment.method,
        balanceAmount: this.serializeDecimal(result.order.balanceAmount),
      },
    );

    return {
      payment: this.serializePayment(result.payment),
      order: this.serializeOrder(result.order),
    };
  }

  async chargeOrderToRoom(
    currentUser: CurrentUserPayload,
    orderId: number,
    chargeDto: ChargePosOrderToRoomDto,
  ) {
    const order = await this.findRequiredOrder(orderId);
    this.ensureOrderCanBeChargedToRoom(order);

    const result = await this.posOrdersRepository.runInTransaction(
      async (client) => {
        const currentOrder = await this.posOrdersRepository.findOrder(
          order.id,
          client,
        );

        if (!currentOrder) {
          throw new NotFoundException('POS order was not found.');
        }

        this.ensureOrderCanBeChargedToRoom(currentOrder);

        const stay = await this.posRoomChargesRepository.findStay(
          chargeDto.stayId,
          client,
        );

        if (!stay) {
          throw new NotFoundException('Stay was not found.');
        }

        if (stay.status !== StayStatus.ACTIVE) {
          throw new ConflictException(
            'Only active stays can receive POS room charges.',
          );
        }

        const roomAssignment = stay.roomAssignments[0];

        if (!roomAssignment) {
          throw new ConflictException(
            'Stay has no active room assignment for the POS charge.',
          );
        }

        if (!stay.folio || stay.folio.status !== FolioStatus.OPEN) {
          throw new ConflictException(
            'Stay must have an open folio for the POS charge.',
          );
        }

        const existingCharge =
          await this.posRoomChargesRepository.findOrderCharge(
            currentOrder.id,
            client,
          );

        if (existingCharge) {
          throw new ConflictException(
            'POS order has already been charged to a folio.',
          );
        }

        const amount = currentOrder.balanceAmount;
        const charge = await this.posRoomChargesRepository.createCharge(
          {
            folioId: stay.folio.id,
            type: FolioLineItemType.POS_CHARGE,
            description: `POS charge - ${currentOrder.outlet.name} - ${currentOrder.orderNumber}`,
            quantity: 1,
            unitAmount: amount,
            totalAmount: amount,
            sourceType: 'POS_ORDER',
            sourceId: currentOrder.id,
            postedByUserId: currentUser.sub,
          },
          client,
        );
        const folio = await this.posRoomChargesRepository.incrementFolio(
          stay.folio.id,
          amount,
          client,
        );
        const closeOrder = chargeDto.closeOrder ?? true;
        const updatedOrder = await this.posOrdersRepository.updateOrder(
          currentOrder.id,
          {
            roomId: roomAssignment.roomId,
            stayId: stay.id,
            folioId: stay.folio.id,
            paymentStatus: PosOrderPaymentStatus.CHARGED_TO_ROOM,
            balanceAmount: new Prisma.Decimal(0),
            ...(closeOrder
              ? {
                  status: PosOrderStatus.CLOSED,
                  closedAt: new Date(),
                  closedByUserId: currentUser.sub,
                }
              : {}),
          },
          client,
        );

        return { order: updatedOrder, charge, folio, stay, roomAssignment };
      },
    );

    await this.recordOrderAudit(
      currentUser,
      'restaurant.orders.charged_to_room',
      result.order,
      {
        stayId: result.stay.id,
        folioId: result.folio.id,
        roomId: result.roomAssignment.roomId,
        folioLineItemId: result.charge.id,
        amount: this.serializeDecimal(result.charge.totalAmount),
        closed: result.order.status === PosOrderStatus.CLOSED,
      },
    );

    return {
      order: this.serializeOrder(result.order),
      folioCharge: this.serializeRoomCharge(result.charge),
      folio: {
        ...result.folio,
        subtotalAmount: this.serializeDecimal(result.folio.subtotalAmount),
        totalAmount: this.serializeDecimal(result.folio.totalAmount),
        paidAmount: this.serializeDecimal(result.folio.paidAmount),
        balanceAmount: this.serializeDecimal(result.folio.balanceAmount),
      },
    };
  }

  async closeOrder(
    currentUser: CurrentUserPayload,
    orderId: number,
    closeDto: ClosePosOrderDto,
  ) {
    const order = await this.findRequiredOrder(orderId);
    this.ensureOrderIsOpen(order);

    if (order.balanceAmount.gt(0)) {
      throw new ConflictException(
        'POS order must have no unpaid balance before closing.',
      );
    }

    const updatedOrder = await this.posOrdersRepository.updateOrder(order.id, {
      status: PosOrderStatus.CLOSED,
      closedAt: new Date(),
      closedByUserId: currentUser.sub,
      ...(closeDto.notes === undefined
        ? {}
        : { notes: this.normalizeOptionalString(closeDto.notes) }),
    });

    await this.recordOrderAudit(
      currentUser,
      'restaurant.orders.closed',
      updatedOrder,
      {
        previousStatus: order.status,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
      },
    );

    return this.serializeOrder(updatedOrder);
  }

  async generateOrderReceipt(currentUser: CurrentUserPayload, orderId: number) {
    const order = await this.findRequiredOrder(orderId);

    if (order.status !== PosOrderStatus.CLOSED) {
      throw new ConflictException(
        'Only closed POS orders can generate receipts.',
      );
    }

    if (
      order.paymentStatus !== PosOrderPaymentStatus.PAID &&
      order.paymentStatus !== PosOrderPaymentStatus.CHARGED_TO_ROOM
    ) {
      throw new ConflictException(
        'POS order must be fully settled before generating a receipt.',
      );
    }

    const receipt = {
      receiptNumber: `POS-RCT-${order.orderNumber}`,
      generatedAt: new Date(),
      generatedByUserId: currentUser.sub,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        source: order.source,
        tableNumber: order.tableNumber,
        roomId: order.roomId,
        stayId: order.stayId,
        folioId: order.folioId,
        createdAt: order.createdAt,
        closedAt: order.closedAt,
      },
      outlet: order.outlet,
      items: order.items
        .filter((item) => !item.isVoided)
        .map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: this.serializeDecimal(item.unitPrice),
          totalAmount: this.serializeDecimal(item.totalAmount),
          notes: item.notes,
        })),
      payments: order.payments
        .filter((payment) => !payment.isVoided)
        .map((payment) => ({
          id: payment.id,
          paymentNumber: payment.paymentNumber,
          amount: this.serializeDecimal(payment.amount),
          method: payment.method,
          reference: payment.reference,
          recordedAt: payment.recordedAt,
        })),
      totals: {
        subtotalAmount: this.serializeDecimal(order.subtotalAmount),
        discountAmount: this.serializeDecimal(order.discountAmount),
        taxAmount: this.serializeDecimal(order.taxAmount),
        serviceAmount: this.serializeDecimal(order.serviceAmount),
        totalAmount: this.serializeDecimal(order.totalAmount),
        paidAmount: this.serializeDecimal(order.paidAmount),
        balanceAmount: this.serializeDecimal(order.balanceAmount),
      },
    };

    await this.recordOrderAudit(
      currentUser,
      'restaurant.receipts.generated',
      order,
      {
        receiptNumber: receipt.receiptNumber,
        paymentStatus: order.paymentStatus,
        totalAmount: receipt.totals.totalAmount,
      },
    );

    return receipt;
  }

  async cancelOrder(
    currentUser: CurrentUserPayload,
    orderId: number,
    cancelDto: CancelPosOrderDto,
  ) {
    const order = await this.findRequiredOrder(orderId);
    this.ensureOrderIsOpen(order);
    const reason = this.normalizeRequiredString(
      cancelDto.reason,
      'Cancellation reason is required.',
    );
    const updatedOrder = await this.posOrdersRepository.updateOrder(order.id, {
      status: PosOrderStatus.CANCELLED,
      cancelledReason: reason,
      cancelledAt: new Date(),
      cancelledByUserId: currentUser.sub,
    });

    await this.recordOrderAudit(
      currentUser,
      'restaurant.orders.cancelled',
      updatedOrder,
      {
        previousStatus: order.status,
        status: updatedOrder.status,
        reason,
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

  private async findRequiredOrderItem(orderId: number, itemId: number) {
    const item = await this.posOrderItemsRepository.findOrderItem(
      orderId,
      itemId,
    );

    if (!item) {
      throw new NotFoundException('POS order item was not found.');
    }

    return item;
  }

  private ensureOutletIsActive(outlet: OutletRecord) {
    if (!outlet.isActive) {
      throw new ConflictException('Outlet is inactive.');
    }
  }

  private ensureOrderIsOpen(order: PosOrderRecord) {
    if (order.status !== PosOrderStatus.OPEN) {
      throw new ConflictException('Only open POS orders can be modified.');
    }
  }

  private ensureOrderCanBeChargedToRoom(order: PosOrderRecord) {
    this.ensureOrderIsOpen(order);

    if (
      order.paymentStatus === PosOrderPaymentStatus.CHARGED_TO_ROOM ||
      order.folioId !== null
    ) {
      throw new ConflictException(
        'POS order has already been charged to a folio.',
      );
    }

    if (order.balanceAmount.lte(0)) {
      throw new ConflictException('POS order has no outstanding balance.');
    }
  }

  private ensureMenuItemCanBeOrdered(
    menuItem: MenuItemRecord,
    order: PosOrderRecord,
  ) {
    if (menuItem.outletId !== order.outletId) {
      throw new BadRequestException('Menu item belongs to a different outlet.');
    }

    if (menuItem.status !== MenuItemStatus.ACTIVE) {
      throw new ConflictException(
        'Only active menu items can be added to an order.',
      );
    }
  }

  private async recalculateOrder(
    order: PosOrderRecord,
    client: Prisma.TransactionClient,
  ) {
    const subtotalAmount = order.items.reduce(
      (total, item) => (item.isVoided ? total : total.add(item.totalAmount)),
      new Prisma.Decimal(0),
    );
    const totalAmount = subtotalAmount
      .sub(order.discountAmount)
      .add(order.taxAmount)
      .add(order.serviceAmount);

    if (totalAmount.lt(order.paidAmount)) {
      throw new ConflictException(
        'Order items cannot reduce the total below the amount already paid.',
      );
    }

    const balanceAmount = totalAmount.sub(order.paidAmount);
    const paymentStatus = order.paidAmount.eq(0)
      ? PosOrderPaymentStatus.UNPAID
      : balanceAmount.eq(0)
        ? PosOrderPaymentStatus.PAID
        : PosOrderPaymentStatus.PARTIALLY_PAID;

    return this.posOrdersRepository.updateOrder(
      order.id,
      {
        subtotalAmount,
        totalAmount,
        balanceAmount,
        paymentStatus,
      },
      client,
    );
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

  private serializePayment(payment: PosOrderPaymentRecord) {
    return {
      ...payment,
      amount: this.serializeDecimal(payment.amount),
    };
  }

  private serializeRoomCharge(charge: PosRoomChargeRecord) {
    return {
      ...charge,
      unitAmount: this.serializeDecimal(charge.unitAmount),
      totalAmount: this.serializeDecimal(charge.totalAmount),
    };
  }

  private serializeSalesSummary(
    summary: Awaited<
      ReturnType<RestaurantReportsRepository['getSalesSummary']>
    >,
    filters: RestaurantReportFilters,
  ) {
    const outletLookup = new Map(
      summary.outlets.map((outlet) => [outlet.id, outlet]),
    );

    return {
      period: this.serializeReportPeriod(filters),
      totalOrders: summary.totalOrders,
      closedOrders: summary.closedOrders,
      cancelledOrders: summary.cancelledOrders,
      grossSales: this.serializeNullableDecimal(summary.grossSales),
      directPayments: this.serializeNullableDecimal(summary.directPayments),
      roomCharges: this.serializeNullableDecimal(summary.roomCharges),
      unpaidBalance: this.serializeNullableDecimal(summary.unpaidBalance),
      salesByOutlet: summary.outletGroups.map((group) => ({
        outlet: outletLookup.get(group.outletId) ?? {
          id: group.outletId,
          name: null,
          code: null,
        },
        orderCount: group._count._all,
        grossSales: this.serializeNullableDecimal(group._sum.totalAmount),
      })),
      salesByPaymentMethod: summary.paymentGroups.map((group) => ({
        method: group.method,
        paymentCount: group._count._all,
        amount: this.serializeNullableDecimal(group._sum.amount),
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

  private async generatePaymentNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const sequence = `${Date.now().toString().slice(-6)}${attempt}`.slice(-6);
      const paymentNumber = `POS-PAY-${datePart}-${sequence}`;
      const existingPayment =
        await this.posOrderPaymentsRepository.findByPaymentNumber(
          paymentNumber,
        );

      if (!existingPayment) {
        return paymentNumber;
      }
    }

    throw new ConflictException(
      'Could not generate a unique POS payment number.',
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

  private reportFilters(
    query: {
      outletId?: number;
      createdFrom?: string;
      createdTo?: string;
    },
    defaultToToday = false,
  ): RestaurantReportFilters {
    let createdFrom = this.parseOptionalDate(query.createdFrom);
    let createdTo = this.parseOptionalDate(query.createdTo);

    if (defaultToToday && !createdFrom && !createdTo) {
      createdFrom = new Date();
      createdFrom.setHours(0, 0, 0, 0);
      createdTo = new Date(createdFrom);
      createdTo.setDate(createdTo.getDate() + 1);
    }

    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new BadRequestException(
        'Report start date cannot be after the end date.',
      );
    }

    return {
      outletId: query.outletId,
      createdFrom,
      createdTo,
    };
  }

  private serializeReportPeriod(filters: RestaurantReportFilters) {
    return {
      createdFrom: filters.createdFrom ?? null,
      createdTo: filters.createdTo ?? null,
    };
  }

  private serializeNullableDecimal(value: Prisma.Decimal | null) {
    return this.serializeDecimal(value ?? new Prisma.Decimal(0));
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
