import {
  Body,
  Controller,
  Get,
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
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { GetInvoicesQueryDto } from './dto/get-invoices-query.dto';
import { VoidInvoiceDto } from './dto/void-invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices and Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('generate')
  @Permissions('invoices.generate')
  @ApiOperation({ summary: 'Generate an issued invoice from folio totals' })
  @ApiCreatedResponse({ description: 'Invoice generated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid invoice generation payload.' })
  @ApiConflictResponse({ description: 'Folio already has an issued invoice.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Folio was not found.' })
  generate(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() generateInvoiceDto: GenerateInvoiceDto,
  ) {
    return this.invoicesService.generate(currentUser, generateInvoiceDto);
  }

  @Get()
  @Permissions('invoices.read')
  @ApiOperation({ summary: 'List invoices' })
  @ApiOkResponse({ description: 'Invoices returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetInvoicesQueryDto,
  ) {
    return this.invoicesService.list(currentUser, query);
  }

  @Get('by-folio/:folioId')
  @Permissions('invoices.read')
  @ApiOperation({ summary: 'List invoices for one folio' })
  @ApiOkResponse({ description: 'Folio invoices returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Folio was not found.' })
  listByFolio(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('folioId', ParseIntPipe) folioId: number,
    @Query() query: GetInvoicesQueryDto,
  ) {
    return this.invoicesService.listByFolio(currentUser, folioId, query);
  }

  @Get(':id')
  @Permissions('invoices.read')
  @ApiOperation({ summary: 'Get one invoice' })
  @ApiOkResponse({ description: 'Invoice returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Invoice was not found.' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) invoiceId: number,
  ) {
    return this.invoicesService.getById(currentUser, invoiceId);
  }

  @Patch(':id/void')
  @Permissions('invoices.generate')
  @ApiOperation({ summary: 'Void an issued invoice' })
  @ApiOkResponse({ description: 'Invoice voided successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid invoice void payload.' })
  @ApiConflictResponse({ description: 'Invoice cannot be voided.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Invoice was not found.' })
  void(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) invoiceId: number,
    @Body() voidInvoiceDto: VoidInvoiceDto,
  ) {
    return this.invoicesService.void(currentUser, invoiceId, voidInvoiceDto);
  }
}
