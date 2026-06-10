/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { REQUIRED_PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';

describe('RestaurantController', () => {
  let controller: RestaurantController;
  let restaurantService: {
    createOutlet: jest.Mock;
    listOutlets: jest.Mock;
    getOutletById: jest.Mock;
    updateOutlet: jest.Mock;
    deactivateOutlet: jest.Mock;
    createMenuItem: jest.Mock;
    listMenuItems: jest.Mock;
    getMenuItemById: jest.Mock;
    updateMenuItem: jest.Mock;
    deactivateMenuItem: jest.Mock;
    markMenuItemOutOfStock: jest.Mock;
    markMenuItemActive: jest.Mock;
    createOrder: jest.Mock;
    listOrders: jest.Mock;
    getOrderById: jest.Mock;
    updateOrder: jest.Mock;
    addOrderItem: jest.Mock;
    updateOrderItem: jest.Mock;
    voidOrderItem: jest.Mock;
    recordOrderPayment: jest.Mock;
    chargeOrderToRoom: jest.Mock;
    closeOrder: jest.Mock;
    cancelOrder: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: null,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    restaurantService = {
      createOutlet: jest.fn(),
      listOutlets: jest.fn(),
      getOutletById: jest.fn(),
      updateOutlet: jest.fn(),
      deactivateOutlet: jest.fn(),
      createMenuItem: jest.fn(),
      listMenuItems: jest.fn(),
      getMenuItemById: jest.fn(),
      updateMenuItem: jest.fn(),
      deactivateMenuItem: jest.fn(),
      markMenuItemOutOfStock: jest.fn(),
      markMenuItemActive: jest.fn(),
      createOrder: jest.fn(),
      listOrders: jest.fn(),
      getOrderById: jest.fn(),
      updateOrder: jest.fn(),
      addOrderItem: jest.fn(),
      updateOrderItem: jest.fn(),
      voidOrderItem: jest.fn(),
      recordOrderPayment: jest.fn(),
      chargeOrderToRoom: jest.fn(),
      closeOrder: jest.fn(),
      cancelOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RestaurantController],
      providers: [
        {
          provide: RestaurantService,
          useValue: restaurantService,
        },
        {
          provide: PrismaService,
          useValue: {
            role: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<RestaurantController>(RestaurantController);
  });

  it('protects restaurant routes with auth and permission guards', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, RestaurantController)).toEqual([
      JwtAuthGuard,
      PermissionsGuard,
    ]);
  });

  it('declares outlet route permissions', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.createOutlet,
      ),
    ).toEqual(['pos.menu_items.create']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.listOutlets,
      ),
    ).toEqual(['pos.menu_items.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.getOutletById,
      ),
    ).toEqual(['pos.menu_items.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.updateOutlet,
      ),
    ).toEqual(['pos.menu_items.update']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.deactivateOutlet,
      ),
    ).toEqual(['pos.menu_items.delete']);
  });

  it('declares menu item route permissions', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.createMenuItem,
      ),
    ).toEqual(['pos.menu_items.create']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.listMenuItems,
      ),
    ).toEqual(['pos.menu_items.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.updateMenuItem,
      ),
    ).toEqual(['pos.menu_items.update']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.deactivateMenuItem,
      ),
    ).toEqual(['pos.menu_items.delete']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.markMenuItemOutOfStock,
      ),
    ).toEqual(['pos.menu_items.update']);
  });

  it('declares POS order route permissions', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.createOrder,
      ),
    ).toEqual(['pos.orders.create']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.listOrders,
      ),
    ).toEqual(['pos.orders.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.getOrderById,
      ),
    ).toEqual(['pos.orders.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.updateOrder,
      ),
    ).toEqual(['pos.orders.update']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.addOrderItem,
      ),
    ).toEqual(['pos.orders.update']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.updateOrderItem,
      ),
    ).toEqual(['pos.orders.update']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.voidOrderItem,
      ),
    ).toEqual(['pos.orders.update']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.recordOrderPayment,
      ),
    ).toEqual(['pos.payments.record']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.chargeOrderToRoom,
      ),
    ).toEqual(['pos.charge_to_room']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.closeOrder,
      ),
    ).toEqual(['pos.orders.close']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        RestaurantController.prototype.cancelOrder,
      ),
    ).toEqual(['pos.orders.cancel']);
  });

  it('delegates outlet operations to the service', async () => {
    const createDto = {
      name: 'Main Restaurant',
      code: 'MAIN-RESTAURANT',
      type: 'RESTAURANT' as const,
    };
    const query = {
      page: 1,
      limit: 20,
    };
    const outlet = {
      id: 4,
      code: 'MAIN-RESTAURANT',
    };
    restaurantService.createOutlet.mockResolvedValue(outlet);
    restaurantService.listOutlets.mockResolvedValue({
      items: [outlet],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    restaurantService.getOutletById.mockResolvedValue(outlet);
    restaurantService.updateOutlet.mockResolvedValue(outlet);
    restaurantService.deactivateOutlet.mockResolvedValue({
      ...outlet,
      isActive: false,
    });

    await controller.createOutlet(currentUser, createDto);
    await controller.listOutlets(currentUser, query);
    await controller.getOutletById(currentUser, 4);
    await controller.updateOutlet(currentUser, 4, {
      name: 'Updated Restaurant',
    });
    await controller.deactivateOutlet(currentUser, 4);

    expect(restaurantService.createOutlet).toHaveBeenCalledWith(
      currentUser,
      createDto,
    );
    expect(restaurantService.listOutlets).toHaveBeenCalledWith(
      currentUser,
      query,
    );
    expect(restaurantService.getOutletById).toHaveBeenCalledWith(
      currentUser,
      4,
    );
    expect(restaurantService.updateOutlet).toHaveBeenCalledWith(
      currentUser,
      4,
      {
        name: 'Updated Restaurant',
      },
    );
    expect(restaurantService.deactivateOutlet).toHaveBeenCalledWith(
      currentUser,
      4,
    );
  });

  it('delegates menu item operations to the service', async () => {
    const createDto = {
      outletId: 4,
      name: 'Special Tibs',
      code: 'TIBS-01',
      price: 450,
    };
    const query = { page: 1, limit: 20, outletId: 4 };
    const menuItem = { id: 7, ...createDto };
    restaurantService.createMenuItem.mockResolvedValue(menuItem);
    restaurantService.listMenuItems.mockResolvedValue({
      items: [menuItem],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    restaurantService.getMenuItemById.mockResolvedValue(menuItem);
    restaurantService.updateMenuItem.mockResolvedValue(menuItem);
    restaurantService.deactivateMenuItem.mockResolvedValue(menuItem);
    restaurantService.markMenuItemOutOfStock.mockResolvedValue(menuItem);
    restaurantService.markMenuItemActive.mockResolvedValue(menuItem);

    await controller.createMenuItem(currentUser, createDto);
    await controller.listMenuItems(currentUser, query);
    await controller.getMenuItemById(currentUser, 7);
    await controller.updateMenuItem(currentUser, 7, { price: 475 });
    await controller.deactivateMenuItem(currentUser, 7);
    await controller.markMenuItemOutOfStock(currentUser, 7);
    await controller.markMenuItemActive(currentUser, 7);

    expect(restaurantService.createMenuItem).toHaveBeenCalledWith(
      currentUser,
      createDto,
    );
    expect(restaurantService.listMenuItems).toHaveBeenCalledWith(
      currentUser,
      query,
    );
    expect(restaurantService.getMenuItemById).toHaveBeenCalledWith(
      currentUser,
      7,
    );
    expect(restaurantService.updateMenuItem).toHaveBeenCalledWith(
      currentUser,
      7,
      { price: 475 },
    );
    expect(restaurantService.deactivateMenuItem).toHaveBeenCalledWith(
      currentUser,
      7,
    );
  });

  it('delegates POS order operations to the service', async () => {
    const createDto = {
      outletId: 4,
      source: 'TABLE_SERVICE' as const,
      tableNumber: 'T-12',
    };
    const query = { page: 1, limit: 20, outletId: 4 };
    const order = { id: 9, ...createDto };
    restaurantService.createOrder.mockResolvedValue(order);
    restaurantService.listOrders.mockResolvedValue({
      items: [order],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    restaurantService.getOrderById.mockResolvedValue(order);
    restaurantService.updateOrder.mockResolvedValue(order);
    restaurantService.addOrderItem.mockResolvedValue(order);
    restaurantService.updateOrderItem.mockResolvedValue(order);
    restaurantService.voidOrderItem.mockResolvedValue(order);
    restaurantService.recordOrderPayment.mockResolvedValue({
      payment: { id: 15 },
      order,
    });
    restaurantService.chargeOrderToRoom.mockResolvedValue({
      order,
      folioCharge: { id: 18 },
    });
    restaurantService.closeOrder.mockResolvedValue(order);
    restaurantService.cancelOrder.mockResolvedValue(order);

    await controller.createOrder(currentUser, createDto);
    await controller.listOrders(currentUser, query);
    await controller.getOrderById(currentUser, 9);
    await controller.updateOrder(currentUser, 9, { tableNumber: 'T-14' });
    await controller.addOrderItem(currentUser, 9, {
      menuItemId: 7,
      quantity: 2,
    });
    await controller.updateOrderItem(currentUser, 9, 12, { quantity: 3 });
    await controller.voidOrderItem(currentUser, 9, 12, {
      reason: 'Guest cancelled.',
    });
    await controller.recordOrderPayment(currentUser, 9, {
      amount: 450,
      method: 'CASH',
    });
    await controller.chargeOrderToRoom(currentUser, 9, {
      stayId: 42,
      closeOrder: true,
    });
    await controller.closeOrder(currentUser, 9, {
      notes: 'Payment verified.',
    });
    await controller.cancelOrder(currentUser, 10, {
      reason: 'Guest cancelled.',
    });

    expect(restaurantService.createOrder).toHaveBeenCalledWith(
      currentUser,
      createDto,
    );
    expect(restaurantService.listOrders).toHaveBeenCalledWith(
      currentUser,
      query,
    );
    expect(restaurantService.getOrderById).toHaveBeenCalledWith(currentUser, 9);
    expect(restaurantService.updateOrder).toHaveBeenCalledWith(currentUser, 9, {
      tableNumber: 'T-14',
    });
    expect(restaurantService.addOrderItem).toHaveBeenCalledWith(
      currentUser,
      9,
      { menuItemId: 7, quantity: 2 },
    );
    expect(restaurantService.updateOrderItem).toHaveBeenCalledWith(
      currentUser,
      9,
      12,
      { quantity: 3 },
    );
    expect(restaurantService.voidOrderItem).toHaveBeenCalledWith(
      currentUser,
      9,
      12,
      { reason: 'Guest cancelled.' },
    );
    expect(restaurantService.recordOrderPayment).toHaveBeenCalledWith(
      currentUser,
      9,
      { amount: 450, method: 'CASH' },
    );
    expect(restaurantService.chargeOrderToRoom).toHaveBeenCalledWith(
      currentUser,
      9,
      { stayId: 42, closeOrder: true },
    );
    expect(restaurantService.closeOrder).toHaveBeenCalledWith(currentUser, 9, {
      notes: 'Payment verified.',
    });
    expect(restaurantService.cancelOrder).toHaveBeenCalledWith(
      currentUser,
      10,
      { reason: 'Guest cancelled.' },
    );
  });

  it('delegates room charges that keep the POS order open', async () => {
    restaurantService.chargeOrderToRoom.mockResolvedValue({ order: { id: 9 } });

    await controller.chargeOrderToRoom(currentUser, 9, {
      stayId: 42,
      closeOrder: false,
    });

    expect(restaurantService.chargeOrderToRoom).toHaveBeenCalledWith(
      currentUser,
      9,
      { stayId: 42, closeOrder: false },
    );
  });
});
