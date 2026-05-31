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

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../../auth/types/current-user-payload.type';
import { GenerateReceiptDto } from '../dto/generate-receipt.dto';
import { GetReceiptsQueryDto } from '../dto/get-receipts-query.dto';
import { VoidReceiptDto } from '../dto/void-receipt.dto';
import { InvoicesService } from '../invoices.service';

@ApiTags('Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('generate')
  @Permissions('receipts.generate')
  @ApiOperation({
    summary: 'Generate a receipt from a payment or folio amount',
  })
  @ApiCreatedResponse({ description: 'Receipt generated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid receipt generation payload.' })
  @ApiConflictResponse({ description: 'Receipt cannot be generated.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Folio or payment was not found.' })
  generate(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() generateReceiptDto: GenerateReceiptDto,
  ) {
    return this.invoicesService.generateReceipt(
      currentUser,
      generateReceiptDto,
    );
  }

  @Get()
  @Permissions('receipts.read')
  @ApiOperation({ summary: 'List receipts' })
  @ApiOkResponse({ description: 'Receipts returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetReceiptsQueryDto,
  ) {
    return this.invoicesService.listReceipts(currentUser, query);
  }

  @Get('by-folio/:folioId')
  @Permissions('receipts.read')
  @ApiOperation({ summary: 'List receipts for one folio' })
  @ApiOkResponse({ description: 'Folio receipts returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Folio was not found.' })
  listByFolio(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('folioId', ParseIntPipe) folioId: number,
    @Query() query: GetReceiptsQueryDto,
  ) {
    return this.invoicesService.listReceiptsByFolio(
      currentUser,
      folioId,
      query,
    );
  }

  @Get(':id')
  @Permissions('receipts.read')
  @ApiOperation({ summary: 'Get one receipt' })
  @ApiOkResponse({ description: 'Receipt returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Receipt was not found.' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) receiptId: number,
  ) {
    return this.invoicesService.getReceiptById(currentUser, receiptId);
  }

  @Patch(':id/void')
  @Permissions('receipts.generate')
  @ApiOperation({ summary: 'Void an issued receipt' })
  @ApiOkResponse({ description: 'Receipt voided successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid receipt void payload.' })
  @ApiConflictResponse({ description: 'Receipt cannot be voided.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Receipt was not found.' })
  void(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) receiptId: number,
    @Body() voidReceiptDto: VoidReceiptDto,
  ) {
    return this.invoicesService.voidReceipt(
      currentUser,
      receiptId,
      voidReceiptDto,
    );
  }
}
