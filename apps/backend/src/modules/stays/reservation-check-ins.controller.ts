import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { CheckInReservationDto } from './dto/check-in-reservation.dto';
import { StaysService } from './stays.service';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reservations')
export class ReservationCheckInsController {
  constructor(private readonly staysService: StaysService) {}

  @Post(':id/check-in')
  @Permissions('check_in.execute')
  @ApiOperation({ summary: 'Check in a confirmed reservation' })
  @ApiCreatedResponse({ description: 'Reservation checked in successfully.' })
  @ApiBadRequestResponse({
    description: 'Invalid check-in payload or unavailable guest/room state.',
  })
  @ApiConflictResponse({
    description:
      'Reservation or room cannot be checked in in its current state.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Reservation or room was not found.' })
  checkIn(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) reservationId: number,
    @Body() checkInReservationDto: CheckInReservationDto,
  ) {
    return this.staysService.checkInReservation(
      currentUser,
      reservationId,
      checkInReservationDto,
    );
  }
}
