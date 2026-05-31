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
import { AddFolioLineItemDto } from './dto/add-folio-line-item.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { CloseFolioDto } from './dto/close-folio.dto';
import { CreateFolioDto } from './dto/create-folio.dto';
import { GetFoliosQueryDto } from './dto/get-folios-query.dto';
import { UpdateFolioDto } from './dto/update-folio.dto';
import { VoidFolioLineItemDto } from './dto/void-folio-line-item.dto';
import { FoliosService } from './folios.service';

@ApiTags('Folios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('folios')
export class FoliosController {
  constructor(private readonly foliosService: FoliosService) {}

  @Post()
  @Permissions('folios.create')
  @ApiOperation({ summary: 'Open a folio for an active stay' })
  @ApiCreatedResponse({ description: 'Folio opened successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid folio payload.' })
  @ApiConflictResponse({ description: 'Stay cannot open a folio.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Stay was not found.' })
  create(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createFolioDto: CreateFolioDto,
  ) {
    return this.foliosService.create(currentUser, createFolioDto);
  }

  @Get()
  @Permissions('folios.read')
  @ApiOperation({ summary: 'List folios' })
  @ApiOkResponse({ description: 'Folios returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetFoliosQueryDto,
  ) {
    return this.foliosService.list(currentUser, query);
  }

  @Get('by-stay/:stayId')
  @Permissions('folios.read')
  @ApiOperation({ summary: 'Get the folio for a stay' })
  @ApiOkResponse({ description: 'Folio returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Folio was not found for the stay.' })
  getByStayId(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('stayId', ParseIntPipe) stayId: number,
  ) {
    return this.foliosService.getByStayId(currentUser, stayId);
  }

  @Get(':id/summary')
  @Permissions('folios.read')
  @ApiOperation({ summary: 'Get folio totals and line items' })
  @ApiOkResponse({ description: 'Folio summary returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Folio was not found.' })
  getSummary(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) folioId: number,
  ) {
    return this.foliosService.getSummary(currentUser, folioId);
  }

  @Get(':id')
  @Permissions('folios.read')
  @ApiOperation({ summary: 'Get one folio' })
  @ApiOkResponse({ description: 'Folio returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Folio was not found.' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) folioId: number,
  ) {
    return this.foliosService.getById(currentUser, folioId);
  }

  @Patch(':id')
  @Permissions('folios.update')
  @ApiOperation({ summary: 'Update folio status' })
  @ApiOkResponse({ description: 'Folio updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid folio update payload.' })
  @ApiConflictResponse({ description: 'Folio cannot be updated.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Folio was not found.' })
  update(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) folioId: number,
    @Body() updateFolioDto: UpdateFolioDto,
  ) {
    return this.foliosService.update(currentUser, folioId, updateFolioDto);
  }

  @Patch(':id/close')
  @Permissions('folios.close')
  @ApiOperation({ summary: 'Close a settled open folio' })
  @ApiOkResponse({ description: 'Folio closed successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid close folio payload.' })
  @ApiConflictResponse({ description: 'Folio cannot be closed.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Folio was not found.' })
  close(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) folioId: number,
    @Body() closeFolioDto: CloseFolioDto,
  ) {
    return this.foliosService.close(currentUser, folioId, closeFolioDto);
  }

  @Post(':id/line-items')
  @Permissions('folios.manual_charge.create')
  @ApiOperation({ summary: 'Add a charge line item to an open folio' })
  @ApiCreatedResponse({ description: 'Line item added successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid line item payload.' })
  @ApiConflictResponse({ description: 'Folio cannot accept line items.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Folio was not found.' })
  addLineItem(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) folioId: number,
    @Body() addFolioLineItemDto: AddFolioLineItemDto,
  ) {
    return this.foliosService.addLineItem(
      currentUser,
      folioId,
      addFolioLineItemDto,
    );
  }

  @Post(':id/discounts')
  @Permissions('folios.discount.apply.small')
  @ApiOperation({
    summary: 'Apply a small discount or request approval for a large discount',
  })
  @ApiCreatedResponse({
    description: 'Discount applied or approval request created successfully.',
  })
  @ApiBadRequestResponse({ description: 'Invalid discount payload.' })
  @ApiConflictResponse({ description: 'Folio cannot accept discounts.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Folio was not found.' })
  applyDiscount(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) folioId: number,
    @Body() applyDiscountDto: ApplyDiscountDto,
  ) {
    return this.foliosService.applyDiscount(
      currentUser,
      folioId,
      applyDiscountDto,
    );
  }

  @Patch(':id/line-items/:lineItemId/void')
  @Permissions('folios.charge.void')
  @ApiOperation({ summary: 'Void one folio line item and recalculate totals' })
  @ApiOkResponse({ description: 'Line item voided successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid line item void payload.' })
  @ApiConflictResponse({ description: 'Line item cannot be voided.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Folio or line item was not found.' })
  voidLineItem(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) folioId: number,
    @Param('lineItemId', ParseIntPipe) lineItemId: number,
    @Body() voidFolioLineItemDto: VoidFolioLineItemDto,
  ) {
    return this.foliosService.voidLineItem(
      currentUser,
      folioId,
      lineItemId,
      voidFolioLineItemDto,
    );
  }
}
