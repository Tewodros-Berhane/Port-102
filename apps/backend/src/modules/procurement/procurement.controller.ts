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
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { GetSuppliersQueryDto } from './dto/get-suppliers-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ProcurementService } from './procurement.service';

@ApiTags('Procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('procurement')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

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
