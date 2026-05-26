import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @Permissions('reservations.create')
  @ApiOperation({ summary: 'Create a reservation' })
  @ApiCreatedResponse({ description: 'Reservation created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid reservation payload.' })
  @ApiConflictResponse({ description: 'Requested room is not available.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Guest, room type, or room was not found.',
  })
  create(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createReservationDto: CreateReservationDto,
  ) {
    return this.reservationsService.create(currentUser, createReservationDto);
  }
}
