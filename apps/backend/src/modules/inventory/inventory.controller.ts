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
import { ApproveStockAdjustmentDto } from './dto/approve-stock-adjustment.dto';
import { CancelStockAdjustmentDto } from './dto/cancel-stock-adjustment.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateInventoryLocationDto } from './dto/create-inventory-location.dto';
import { GetInventoryItemsQueryDto } from './dto/get-inventory-items-query.dto';
import { GetInventoryLocationsQueryDto } from './dto/get-inventory-locations-query.dto';
import { GetStockAdjustmentsQueryDto } from './dto/get-stock-adjustments-query.dto';
import { GetStockBalancesQueryDto } from './dto/get-stock-balances-query.dto';
import { GetStockMovementsQueryDto } from './dto/get-stock-movements-query.dto';
import { IssueStockDto } from './dto/issue-stock.dto';
import { ReceiveStockDto } from './dto/receive-stock.dto';
import { RejectStockAdjustmentDto } from './dto/reject-stock-adjustment.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { UpdateInventoryLocationDto } from './dto/update-inventory-location.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('balances')
  @Permissions('inventory.items.read')
  @ApiOperation({ summary: 'List stock balances by item and location' })
  @ApiOkResponse({ description: 'Stock balances returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listStockBalances(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetStockBalancesQueryDto,
  ) {
    return this.inventoryService.listStockBalances(currentUser, query);
  }

  @Get('balances/:itemId')
  @Permissions('inventory.items.read')
  @ApiOperation({ summary: 'List stock balances for one inventory item' })
  @ApiOkResponse({ description: 'Item stock balances returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Inventory item was not found.' })
  getStockBalancesByItem(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Query() query: GetStockBalancesQueryDto,
  ) {
    return this.inventoryService.getStockBalancesByItem(
      currentUser,
      itemId,
      query,
    );
  }

  @Get('movements')
  @Permissions('inventory.movements.read')
  @ApiOperation({ summary: 'List immutable inventory stock movement history' })
  @ApiOkResponse({ description: 'Stock movements returned successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid movement date range.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listStockMovements(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetStockMovementsQueryDto,
  ) {
    return this.inventoryService.listStockMovements(currentUser, query);
  }

  @Post('receive')
  @Permissions('inventory.stock.receive')
  @ApiOperation({ summary: 'Receive stock into an active inventory location' })
  @ApiCreatedResponse({ description: 'Stock received successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid stock receipt payload.' })
  @ApiConflictResponse({
    description: 'Inventory item or location is inactive.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Inventory item or location was not found.',
  })
  receiveStock(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() receiveStockDto: ReceiveStockDto,
  ) {
    return this.inventoryService.receiveStock(currentUser, receiveStockDto);
  }

  @Post('issue')
  @Permissions('inventory.stock.issue')
  @ApiOperation({ summary: 'Issue stock from an active inventory location' })
  @ApiCreatedResponse({ description: 'Stock issued successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid stock issue payload.' })
  @ApiConflictResponse({
    description:
      'Inventory item or location is inactive, or available stock is insufficient.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Inventory item or location was not found.',
  })
  issueStock(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() issueStockDto: IssueStockDto,
  ) {
    return this.inventoryService.issueStock(currentUser, issueStockDto);
  }

  @Post('transfer')
  @Permissions('inventory.stock.transfer')
  @ApiOperation({
    summary: 'Transfer stock between active inventory locations',
  })
  @ApiCreatedResponse({ description: 'Stock transferred successfully.' })
  @ApiBadRequestResponse({
    description: 'Invalid transfer payload or same source/destination.',
  })
  @ApiConflictResponse({
    description:
      'Inventory item or location is inactive, or source stock is insufficient.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Inventory item or location was not found.',
  })
  transferStock(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() transferStockDto: TransferStockDto,
  ) {
    return this.inventoryService.transferStock(currentUser, transferStockDto);
  }

  @Post('adjustments')
  @Permissions('inventory.stock.adjust.request')
  @ApiOperation({ summary: 'Request a stock adjustment' })
  @ApiCreatedResponse({
    description: 'Stock adjustment requested successfully.',
  })
  @ApiBadRequestResponse({ description: 'Invalid adjustment payload.' })
  @ApiConflictResponse({
    description: 'Inventory item or location is inactive.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Inventory item or location was not found.',
  })
  createStockAdjustment(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createAdjustmentDto: CreateStockAdjustmentDto,
  ) {
    return this.inventoryService.createStockAdjustment(
      currentUser,
      createAdjustmentDto,
    );
  }

  @Get('adjustments')
  @Permissions('inventory.stock.adjust')
  @ApiOperation({ summary: 'List stock adjustments' })
  @ApiOkResponse({ description: 'Stock adjustments returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listStockAdjustments(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetStockAdjustmentsQueryDto,
  ) {
    return this.inventoryService.listStockAdjustments(currentUser, query);
  }

  @Get('adjustments/:id')
  @Permissions('inventory.stock.adjust')
  @ApiOperation({ summary: 'Get one stock adjustment' })
  @ApiOkResponse({ description: 'Stock adjustment returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Stock adjustment was not found.' })
  getStockAdjustmentById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) adjustmentId: number,
  ) {
    return this.inventoryService.getStockAdjustmentById(
      currentUser,
      adjustmentId,
    );
  }

  @Patch('adjustments/:id/approve')
  @Permissions('inventory.stock.adjust.approve')
  @ApiOperation({ summary: 'Approve and apply a pending stock adjustment' })
  @ApiOkResponse({ description: 'Stock adjustment approved successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid approval payload.' })
  @ApiConflictResponse({
    description:
      'Adjustment is not pending, inventory state is inactive, or stock is insufficient.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Stock adjustment was not found.' })
  approveStockAdjustment(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) adjustmentId: number,
    @Body() approveAdjustmentDto: ApproveStockAdjustmentDto,
  ) {
    return this.inventoryService.approveStockAdjustment(
      currentUser,
      adjustmentId,
      approveAdjustmentDto,
    );
  }

  @Patch('adjustments/:id/reject')
  @Permissions('inventory.stock.adjust.approve')
  @ApiOperation({ summary: 'Reject a pending stock adjustment' })
  @ApiOkResponse({ description: 'Stock adjustment rejected successfully.' })
  @ApiBadRequestResponse({ description: 'Rejection reason is required.' })
  @ApiConflictResponse({ description: 'Adjustment is not pending.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Stock adjustment was not found.' })
  rejectStockAdjustment(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) adjustmentId: number,
    @Body() rejectAdjustmentDto: RejectStockAdjustmentDto,
  ) {
    return this.inventoryService.rejectStockAdjustment(
      currentUser,
      adjustmentId,
      rejectAdjustmentDto,
    );
  }

  @Patch('adjustments/:id/cancel')
  @Permissions('inventory.stock.adjust.request')
  @ApiOperation({ summary: 'Cancel a pending stock adjustment' })
  @ApiOkResponse({ description: 'Stock adjustment cancelled successfully.' })
  @ApiBadRequestResponse({ description: 'Cancellation reason is required.' })
  @ApiConflictResponse({ description: 'Adjustment is not pending.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Stock adjustment was not found.' })
  cancelStockAdjustment(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) adjustmentId: number,
    @Body() cancelAdjustmentDto: CancelStockAdjustmentDto,
  ) {
    return this.inventoryService.cancelStockAdjustment(
      currentUser,
      adjustmentId,
      cancelAdjustmentDto,
    );
  }

  @Post('items')
  @Permissions('inventory.items.create')
  @ApiOperation({ summary: 'Create an inventory item master record' })
  @ApiCreatedResponse({ description: 'Inventory item created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid inventory item payload.' })
  @ApiConflictResponse({ description: 'Item number already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  createItem(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createItemDto: CreateInventoryItemDto,
  ) {
    return this.inventoryService.createItem(currentUser, createItemDto);
  }

  @Get('items')
  @Permissions('inventory.items.read')
  @ApiOperation({ summary: 'List inventory item master records' })
  @ApiOkResponse({ description: 'Inventory items returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listItems(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetInventoryItemsQueryDto,
  ) {
    return this.inventoryService.listItems(currentUser, query);
  }

  @Get('items/:id')
  @Permissions('inventory.items.read')
  @ApiOperation({ summary: 'Get one inventory item master record' })
  @ApiOkResponse({ description: 'Inventory item returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Inventory item was not found.' })
  getItemById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) itemId: number,
  ) {
    return this.inventoryService.getItemById(currentUser, itemId);
  }

  @Patch('items/:id')
  @Permissions('inventory.items.update')
  @ApiOperation({ summary: 'Update an inventory item master record' })
  @ApiOkResponse({ description: 'Inventory item updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid inventory item payload.' })
  @ApiConflictResponse({ description: 'Item number already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Inventory item was not found.' })
  updateItem(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) itemId: number,
    @Body() updateItemDto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.updateItem(currentUser, itemId, updateItemDto);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('inventory.items.delete')
  @ApiOperation({ summary: 'Deactivate an inventory item' })
  @ApiOkResponse({ description: 'Inventory item deactivated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Inventory item was not found.' })
  deactivateItem(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) itemId: number,
  ) {
    return this.inventoryService.deactivateItem(currentUser, itemId);
  }

  @Post('locations')
  @Permissions('inventory.items.create')
  @ApiOperation({ summary: 'Create an inventory stock location' })
  @ApiCreatedResponse({
    description: 'Inventory location created successfully.',
  })
  @ApiBadRequestResponse({ description: 'Invalid location payload.' })
  @ApiConflictResponse({ description: 'Location code already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  createLocation(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createLocationDto: CreateInventoryLocationDto,
  ) {
    return this.inventoryService.createLocation(currentUser, createLocationDto);
  }

  @Get('locations')
  @Permissions('inventory.items.read')
  @ApiOperation({ summary: 'List inventory stock locations' })
  @ApiOkResponse({ description: 'Inventory locations returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listLocations(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetInventoryLocationsQueryDto,
  ) {
    return this.inventoryService.listLocations(currentUser, query);
  }

  @Get('locations/:id')
  @Permissions('inventory.items.read')
  @ApiOperation({ summary: 'Get one inventory stock location' })
  @ApiOkResponse({ description: 'Inventory location returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Inventory location was not found.' })
  getLocationById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) locationId: number,
  ) {
    return this.inventoryService.getLocationById(currentUser, locationId);
  }

  @Patch('locations/:id')
  @Permissions('inventory.items.update')
  @ApiOperation({ summary: 'Update an inventory stock location' })
  @ApiOkResponse({ description: 'Inventory location updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid location payload.' })
  @ApiConflictResponse({ description: 'Location code already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Inventory location was not found.' })
  updateLocation(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) locationId: number,
    @Body() updateLocationDto: UpdateInventoryLocationDto,
  ) {
    return this.inventoryService.updateLocation(
      currentUser,
      locationId,
      updateLocationDto,
    );
  }

  @Delete('locations/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('inventory.items.delete')
  @ApiOperation({ summary: 'Deactivate an inventory stock location' })
  @ApiOkResponse({
    description: 'Inventory location deactivated successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Inventory location was not found.' })
  deactivateLocation(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) locationId: number,
  ) {
    return this.inventoryService.deactivateLocation(currentUser, locationId);
  }
}
