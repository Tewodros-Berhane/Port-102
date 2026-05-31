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
import { GetPaymentsQueryDto } from './dto/get-payments-query.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { VoidPaymentDto } from './dto/void-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Permissions('payments.record')
  @ApiOperation({ summary: 'Record a payment against an open folio' })
  @ApiCreatedResponse({ description: 'Payment recorded successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid payment payload.' })
  @ApiConflictResponse({ description: 'Folio cannot accept the payment.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Folio was not found.' })
  record(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() recordPaymentDto: RecordPaymentDto,
  ) {
    return this.paymentsService.record(currentUser, recordPaymentDto);
  }

  @Get()
  @Permissions('payments.read')
  @ApiOperation({ summary: 'List payments' })
  @ApiOkResponse({ description: 'Payments returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetPaymentsQueryDto,
  ) {
    return this.paymentsService.list(currentUser, query);
  }

  @Get('by-folio/:folioId')
  @Permissions('payments.read')
  @ApiOperation({ summary: 'List payments for one folio' })
  @ApiOkResponse({ description: 'Folio payments returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Folio was not found.' })
  listByFolio(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('folioId', ParseIntPipe) folioId: number,
    @Query() query: GetPaymentsQueryDto,
  ) {
    return this.paymentsService.listByFolio(currentUser, folioId, query);
  }

  @Get(':id')
  @Permissions('payments.read')
  @ApiOperation({ summary: 'Get one payment' })
  @ApiOkResponse({ description: 'Payment returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Payment was not found.' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) paymentId: number,
  ) {
    return this.paymentsService.getById(currentUser, paymentId);
  }

  @Patch(':id/void')
  @Permissions('payments.void')
  @ApiOperation({
    summary: 'Void a recorded payment and recalculate folio balance',
  })
  @ApiOkResponse({ description: 'Payment voided successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid void payload.' })
  @ApiConflictResponse({ description: 'Payment cannot be voided.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Payment was not found.' })
  void(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) paymentId: number,
    @Body() voidPaymentDto: VoidPaymentDto,
  ) {
    return this.paymentsService.void(currentUser, paymentId, voidPaymentDto);
  }
}
