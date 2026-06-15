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
