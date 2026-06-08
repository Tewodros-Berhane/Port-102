import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AddPosOrderItemDto } from './dto/add-pos-order-item.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { CreatePosOrderDto } from './dto/create-pos-order.dto';
import { GetMenuItemsQueryDto } from './dto/get-menu-items-query.dto';
import { GetOutletsQueryDto } from './dto/get-outlets-query.dto';
import { GetPosOrdersQueryDto } from './dto/get-pos-orders-query.dto';
import { RecordPosOrderPaymentDto } from './dto/record-pos-order-payment.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { UpdatePosOrderItemDto } from './dto/update-pos-order-item.dto';
import { UpdatePosOrderDto } from './dto/update-pos-order.dto';
import { VoidPosOrderItemDto } from './dto/void-pos-order-item.dto';
import { RestaurantService } from './restaurant.service';

@ApiTags('Restaurant POS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('restaurant')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Post('outlets')
  @Permissions('pos.menu_items.create')
  @ApiOperation({ summary: 'Create a restaurant POS outlet' })
  @ApiCreatedResponse({ description: 'Outlet created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid outlet payload.' })
  @ApiConflictResponse({ description: 'Outlet code already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  createOutlet(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createOutletDto: CreateOutletDto,
  ) {
    return this.restaurantService.createOutlet(currentUser, createOutletDto);
  }

  @Get('outlets')
  @Permissions('pos.menu_items.read')
  @ApiOperation({ summary: 'List restaurant POS outlets' })
  @ApiOkResponse({ description: 'Outlets returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listOutlets(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetOutletsQueryDto,
  ) {
    return this.restaurantService.listOutlets(currentUser, query);
  }

  @Get('outlets/:id')
  @Permissions('pos.menu_items.read')
  @ApiOperation({ summary: 'Get one restaurant POS outlet' })
  @ApiOkResponse({ description: 'Outlet returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Outlet was not found.' })
  getOutletById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) outletId: number,
  ) {
    return this.restaurantService.getOutletById(currentUser, outletId);
  }

  @Patch('outlets/:id')
  @Permissions('pos.menu_items.update')
  @ApiOperation({ summary: 'Update a restaurant POS outlet' })
  @ApiOkResponse({ description: 'Outlet updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid outlet payload.' })
  @ApiConflictResponse({ description: 'Outlet code already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Outlet was not found.' })
  updateOutlet(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) outletId: number,
    @Body() updateOutletDto: UpdateOutletDto,
  ) {
    return this.restaurantService.updateOutlet(
      currentUser,
      outletId,
      updateOutletDto,
    );
  }

  @Delete('outlets/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('pos.menu_items.delete')
  @ApiOperation({ summary: 'Deactivate a restaurant POS outlet' })
  @ApiOkResponse({ description: 'Outlet deactivated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Outlet was not found.' })
  deactivateOutlet(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) outletId: number,
  ) {
    return this.restaurantService.deactivateOutlet(currentUser, outletId);
  }

  @Post('menu-items')
  @Permissions('pos.menu_items.create')
  @ApiOperation({ summary: 'Create an outlet menu or product item' })
  @ApiCreatedResponse({ description: 'Menu item created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid menu item payload.' })
  @ApiConflictResponse({
    description: 'Outlet is inactive or item code already exists.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Outlet was not found.' })
  createMenuItem(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createMenuItemDto: CreateMenuItemDto,
  ) {
    return this.restaurantService.createMenuItem(
      currentUser,
      createMenuItemDto,
    );
  }

  @Get('menu-items')
  @Permissions('pos.menu_items.read')
  @ApiOperation({ summary: 'List outlet menu and product items' })
  @ApiOkResponse({ description: 'Menu items returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listMenuItems(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetMenuItemsQueryDto,
  ) {
    return this.restaurantService.listMenuItems(currentUser, query);
  }

  @Get('menu-items/:id')
  @Permissions('pos.menu_items.read')
  @ApiOperation({ summary: 'Get one outlet menu or product item' })
  @ApiOkResponse({ description: 'Menu item returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Menu item was not found.' })
  getMenuItemById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) menuItemId: number,
  ) {
    return this.restaurantService.getMenuItemById(currentUser, menuItemId);
  }

  @Patch('menu-items/:id')
  @Permissions('pos.menu_items.update')
  @ApiOperation({ summary: 'Update an outlet menu or product item' })
  @ApiOkResponse({ description: 'Menu item updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid menu item payload.' })
  @ApiConflictResponse({
    description: 'Outlet is inactive or item code already exists.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Menu item or outlet was not found.' })
  updateMenuItem(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) menuItemId: number,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.restaurantService.updateMenuItem(
      currentUser,
      menuItemId,
      updateMenuItemDto,
    );
  }

  @Delete('menu-items/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('pos.menu_items.delete')
  @ApiOperation({ summary: 'Deactivate an outlet menu or product item' })
  @ApiOkResponse({ description: 'Menu item deactivated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Menu item was not found.' })
  deactivateMenuItem(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) menuItemId: number,
  ) {
    return this.restaurantService.deactivateMenuItem(currentUser, menuItemId);
  }

  @Patch('menu-items/:id/mark-out-of-stock')
  @Permissions('pos.menu_items.update')
  @ApiOperation({ summary: 'Mark a menu or product item out of stock' })
  @ApiOkResponse({ description: 'Menu item marked out of stock.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Menu item was not found.' })
  markMenuItemOutOfStock(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) menuItemId: number,
  ) {
    return this.restaurantService.markMenuItemOutOfStock(
      currentUser,
      menuItemId,
    );
  }

  @Patch('menu-items/:id/mark-active')
  @Permissions('pos.menu_items.update')
  @ApiOperation({ summary: 'Mark a menu or product item active' })
  @ApiOkResponse({ description: 'Menu item marked active.' })
  @ApiConflictResponse({ description: 'The linked outlet is inactive.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Menu item or outlet was not found.' })
  markMenuItemActive(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) menuItemId: number,
  ) {
    return this.restaurantService.markMenuItemActive(currentUser, menuItemId);
  }

  @Post('orders')
  @Permissions('pos.orders.create')
  @ApiOperation({ summary: 'Create an open POS order for an active outlet' })
  @ApiCreatedResponse({ description: 'POS order created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid POS order payload.' })
  @ApiConflictResponse({ description: 'Outlet is inactive.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Outlet was not found.' })
  createOrder(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createPosOrderDto: CreatePosOrderDto,
  ) {
    return this.restaurantService.createOrder(currentUser, createPosOrderDto);
  }

  @Get('orders')
  @Permissions('pos.orders.read')
  @ApiOperation({ summary: 'List POS orders' })
  @ApiOkResponse({ description: 'POS orders returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listOrders(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetPosOrdersQueryDto,
  ) {
    return this.restaurantService.listOrders(currentUser, query);
  }

  @Get('orders/:id')
  @Permissions('pos.orders.read')
  @ApiOperation({ summary: 'Get one POS order with items and payments' })
  @ApiOkResponse({ description: 'POS order returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'POS order was not found.' })
  getOrderById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.restaurantService.getOrderById(currentUser, orderId);
  }

  @Patch('orders/:id')
  @Permissions('pos.orders.update')
  @ApiOperation({ summary: 'Update metadata on an open POS order' })
  @ApiOkResponse({ description: 'POS order updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid POS order payload.' })
  @ApiConflictResponse({ description: 'Only open orders can be updated.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'POS order was not found.' })
  updateOrder(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) orderId: number,
    @Body() updatePosOrderDto: UpdatePosOrderDto,
  ) {
    return this.restaurantService.updateOrder(
      currentUser,
      orderId,
      updatePosOrderDto,
    );
  }

  @Post('orders/:id/items')
  @Permissions('pos.orders.update')
  @ApiOperation({ summary: 'Add an item to an open POS order' })
  @ApiCreatedResponse({ description: 'POS order item added successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid order item payload.' })
  @ApiConflictResponse({
    description: 'Order is not open or menu item is unavailable.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'POS order or menu item was not found.' })
  addOrderItem(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) orderId: number,
    @Body() addPosOrderItemDto: AddPosOrderItemDto,
  ) {
    return this.restaurantService.addOrderItem(
      currentUser,
      orderId,
      addPosOrderItemDto,
    );
  }

  @Patch('orders/:id/items/:itemId')
  @Permissions('pos.orders.update')
  @ApiOperation({ summary: 'Update an item on an open POS order' })
  @ApiOkResponse({ description: 'POS order item updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid order item payload.' })
  @ApiConflictResponse({
    description: 'Order is not open or item cannot be updated.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'POS order or item was not found.' })
  updateOrderItem(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) orderId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() updatePosOrderItemDto: UpdatePosOrderItemDto,
  ) {
    return this.restaurantService.updateOrderItem(
      currentUser,
      orderId,
      itemId,
      updatePosOrderItemDto,
    );
  }

  @Patch('orders/:id/items/:itemId/void')
  @Permissions('pos.orders.update')
  @ApiOperation({ summary: 'Void an item on an open POS order' })
  @ApiOkResponse({ description: 'POS order item voided successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid void payload.' })
  @ApiConflictResponse({
    description: 'Order is not open or item is already voided.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'POS order or item was not found.' })
  voidOrderItem(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) orderId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() voidPosOrderItemDto: VoidPosOrderItemDto,
  ) {
    return this.restaurantService.voidOrderItem(
      currentUser,
      orderId,
      itemId,
      voidPosOrderItemDto,
    );
  }

  @Post('orders/:id/payments')
  @Permissions('pos.payments.record')
  @ApiOperation({
    summary: 'Record a direct payment against an open POS order',
  })
  @ApiCreatedResponse({ description: 'POS order payment recorded.' })
  @ApiBadRequestResponse({
    description: 'Invalid payment payload or overpayment.',
  })
  @ApiConflictResponse({
    description: 'Order is not open or has no outstanding balance.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'POS order was not found.' })
  recordOrderPayment(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) orderId: number,
    @Body() recordPosOrderPaymentDto: RecordPosOrderPaymentDto,
  ) {
    return this.restaurantService.recordOrderPayment(
      currentUser,
      orderId,
      recordPosOrderPaymentDto,
    );
  }
}
