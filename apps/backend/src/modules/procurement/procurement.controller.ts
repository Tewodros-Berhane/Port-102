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
import { RejectPurchaseRequestDto } from './dto/reject-purchase-request.dto';
import { SubmitPurchaseRequestDto } from './dto/submit-purchase-request.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ProcurementService } from './procurement.service';

@ApiTags('Procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('procurement')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Get('dashboard')
  @Permissions('reports.procurement.read')
  @ApiOperation({ summary: 'Get procurement dashboard counts' })
  @ApiOkResponse({ description: 'Procurement dashboard returned.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  getProcurementDashboard(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: ProcurementDashboardQueryDto,
  ) {
    return this.procurementService.getProcurementDashboard(currentUser, query);
  }

  @Post('purchase-requests')
  @Permissions('purchase_requests.create')
  @ApiOperation({ summary: 'Create a purchase request' })
  @ApiCreatedResponse({ description: 'Purchase request created.' })
  @ApiBadRequestResponse({ description: 'Invalid purchase request payload.' })
  @ApiConflictResponse({ description: 'Inactive inventory item was supplied.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  createPurchaseRequest(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() dto: CreatePurchaseRequestDto,
  ) {
    return this.procurementService.createPurchaseRequest(currentUser, dto);
  }

  @Get('purchase-requests')
  @Permissions('purchase_requests.read')
  @ApiOperation({ summary: 'List purchase requests' })
  @ApiOkResponse({ description: 'Purchase requests returned.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listPurchaseRequests(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetPurchaseRequestsQueryDto,
  ) {
    return this.procurementService.listPurchaseRequests(currentUser, query);
  }

  @Get('purchase-requests/:id')
  @Permissions('purchase_requests.read')
  @ApiOperation({ summary: 'Get one purchase request' })
  @ApiOkResponse({ description: 'Purchase request returned.' })
  @ApiNotFoundResponse({ description: 'Purchase request was not found.' })
  getPurchaseRequestById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.procurementService.getPurchaseRequestById(currentUser, id);
  }

  @Patch('purchase-requests/:id')
  @Permissions('purchase_requests.update')
  @ApiOperation({ summary: 'Update a draft purchase request' })
  @ApiOkResponse({ description: 'Purchase request updated.' })
  @ApiConflictResponse({ description: 'Only draft requests can be updated.' })
  updatePurchaseRequest(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePurchaseRequestDto,
  ) {
    return this.procurementService.updatePurchaseRequest(currentUser, id, dto);
  }

  @Patch('purchase-requests/:id/submit')
  @Permissions('purchase_requests.update')
  @ApiOperation({ summary: 'Submit a draft purchase request' })
  @ApiOkResponse({ description: 'Purchase request submitted.' })
  submitPurchaseRequest(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitPurchaseRequestDto,
  ) {
    return this.procurementService.submitPurchaseRequest(currentUser, id, dto);
  }

  @Patch('purchase-requests/:id/approve')
  @Permissions('purchase_requests.approve')
  @ApiOperation({ summary: 'Approve a submitted purchase request' })
  @ApiOkResponse({ description: 'Purchase request approved.' })
  approvePurchaseRequest(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovePurchaseRequestDto,
  ) {
    return this.procurementService.approvePurchaseRequest(currentUser, id, dto);
  }

  @Patch('purchase-requests/:id/reject')
  @Permissions('purchase_requests.reject')
  @ApiOperation({ summary: 'Reject a submitted purchase request' })
  @ApiOkResponse({ description: 'Purchase request rejected.' })
  @ApiBadRequestResponse({ description: 'Rejection reason is required.' })
  rejectPurchaseRequest(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectPurchaseRequestDto,
  ) {
    return this.procurementService.rejectPurchaseRequest(currentUser, id, dto);
  }

  @Patch('purchase-requests/:id/cancel')
  @Permissions('purchase_requests.update')
  @ApiOperation({ summary: 'Cancel a purchase request' })
  @ApiOkResponse({ description: 'Purchase request cancelled.' })
  cancelPurchaseRequest(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelPurchaseRequestDto,
  ) {
    return this.procurementService.cancelPurchaseRequest(currentUser, id, dto);
  }

  @Post('purchase-orders/from-request/:purchaseRequestId')
  @Permissions('purchase_orders.create')
  @ApiOperation({ summary: 'Create a purchase order from an approved request' })
  @ApiCreatedResponse({ description: 'Purchase order created from request.' })
  createPurchaseOrderFromRequest(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('purchaseRequestId', ParseIntPipe) purchaseRequestId: number,
    @Body() dto: CreatePurchaseOrderFromRequestDto,
  ) {
    return this.procurementService.createPurchaseOrderFromRequest(
      currentUser,
      purchaseRequestId,
      dto,
    );
  }

  @Post('purchase-orders')
  @Permissions('purchase_orders.create')
  @ApiOperation({ summary: 'Create a purchase order' })
  @ApiCreatedResponse({ description: 'Purchase order created.' })
  createPurchaseOrder(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.procurementService.createPurchaseOrder(currentUser, dto);
  }

  @Get('purchase-orders')
  @Permissions('purchase_orders.read')
  @ApiOperation({ summary: 'List purchase orders' })
  @ApiOkResponse({ description: 'Purchase orders returned.' })
  listPurchaseOrders(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetPurchaseOrdersQueryDto,
  ) {
    return this.procurementService.listPurchaseOrders(currentUser, query);
  }

  @Get('purchase-orders/:id')
  @Permissions('purchase_orders.read')
  @ApiOperation({ summary: 'Get one purchase order' })
  @ApiOkResponse({ description: 'Purchase order returned.' })
  getPurchaseOrderById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.procurementService.getPurchaseOrderById(currentUser, id);
  }

  @Patch('purchase-orders/:id')
  @Permissions('purchase_orders.update')
  @ApiOperation({ summary: 'Update a draft purchase order' })
  @ApiOkResponse({ description: 'Purchase order updated.' })
  updatePurchaseOrder(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.procurementService.updatePurchaseOrder(currentUser, id, dto);
  }

  @Patch('purchase-orders/:id/approve')
  @Permissions('purchase_orders.approve')
  @ApiOperation({ summary: 'Approve a purchase order' })
  @ApiOkResponse({ description: 'Purchase order approved.' })
  approvePurchaseOrder(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovePurchaseOrderDto,
  ) {
    return this.procurementService.approvePurchaseOrder(currentUser, id, dto);
  }

  @Patch('purchase-orders/:id/mark-ordered')
  @Permissions('purchase_orders.update')
  @ApiOperation({ summary: 'Mark an approved purchase order as ordered' })
  @ApiOkResponse({ description: 'Purchase order marked ordered.' })
  markPurchaseOrderOrdered(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarkPurchaseOrderOrderedDto,
  ) {
    return this.procurementService.markPurchaseOrderOrdered(
      currentUser,
      id,
      dto,
    );
  }

  @Patch('purchase-orders/:id/cancel')
  @Permissions('purchase_orders.cancel')
  @ApiOperation({ summary: 'Cancel a purchase order' })
  @ApiOkResponse({ description: 'Purchase order cancelled.' })
  cancelPurchaseOrder(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelPurchaseOrderDto,
  ) {
    return this.procurementService.cancelPurchaseOrder(currentUser, id, dto);
  }

  @Post('goods-received')
  @Permissions('goods_received.create')
  @ApiOperation({ summary: 'Create a goods received note' })
  @ApiCreatedResponse({ description: 'Goods received note created.' })
  createGoodsReceived(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() dto: CreateGoodsReceivedDto,
  ) {
    return this.procurementService.createGoodsReceived(currentUser, dto);
  }

  @Get('goods-received')
  @Permissions('goods_received.read')
  @ApiOperation({ summary: 'List goods received notes' })
  @ApiOkResponse({ description: 'Goods received notes returned.' })
  listGoodsReceived(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetGoodsReceivedQueryDto,
  ) {
    return this.procurementService.listGoodsReceived(currentUser, query);
  }

  @Get('goods-received/:id')
  @Permissions('goods_received.read')
  @ApiOperation({ summary: 'Get one goods received note' })
  @ApiOkResponse({ description: 'Goods received note returned.' })
  getGoodsReceivedById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.procurementService.getGoodsReceivedById(currentUser, id);
  }

  @Patch('goods-received/:id/post')
  @Permissions('goods_received.create')
  @ApiOperation({ summary: 'Post goods received into stock' })
  @ApiOkResponse({ description: 'Goods received note posted.' })
  postGoodsReceived(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PostGoodsReceivedDto,
  ) {
    return this.procurementService.postGoodsReceived(currentUser, id, dto);
  }

  @Patch('goods-received/:id/cancel')
  @Permissions('goods_received.create')
  @ApiOperation({ summary: 'Cancel a draft goods received note' })
  @ApiOkResponse({ description: 'Goods received note cancelled.' })
  cancelGoodsReceived(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelGoodsReceivedDto,
  ) {
    return this.procurementService.cancelGoodsReceived(currentUser, id, dto);
  }

  @Post('suppliers')
  @Permissions('suppliers.create')
  @ApiOperation({ summary: 'Create a procurement supplier' })
  @ApiCreatedResponse({ description: 'Supplier created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid supplier payload.' })
  @ApiConflictResponse({ description: 'Supplier number already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  createSupplier(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createSupplierDto: CreateSupplierDto,
  ) {
    return this.procurementService.createSupplier(
      currentUser,
      createSupplierDto,
    );
  }

  @Get('suppliers')
  @Permissions('suppliers.read')
  @ApiOperation({ summary: 'List procurement suppliers' })
  @ApiOkResponse({ description: 'Suppliers returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listSuppliers(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetSuppliersQueryDto,
  ) {
    return this.procurementService.listSuppliers(currentUser, query);
  }

  @Get('suppliers/:id')
  @Permissions('suppliers.read')
  @ApiOperation({ summary: 'Get one procurement supplier' })
  @ApiOkResponse({ description: 'Supplier returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Supplier was not found.' })
  getSupplierById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) supplierId: number,
  ) {
    return this.procurementService.getSupplierById(currentUser, supplierId);
  }

  @Patch('suppliers/:id')
  @Permissions('suppliers.update')
  @ApiOperation({ summary: 'Update a procurement supplier' })
  @ApiOkResponse({ description: 'Supplier updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid supplier payload.' })
  @ApiConflictResponse({ description: 'Supplier number already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Supplier was not found.' })
  updateSupplier(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) supplierId: number,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.procurementService.updateSupplier(
      currentUser,
      supplierId,
      updateSupplierDto,
    );
  }

  @Delete('suppliers/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('suppliers.delete')
  @ApiOperation({ summary: 'Deactivate a procurement supplier' })
  @ApiOkResponse({ description: 'Supplier deactivated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Supplier was not found.' })
  deactivateSupplier(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) supplierId: number,
  ) {
    return this.procurementService.deactivateSupplier(currentUser, supplierId);
  }
}
