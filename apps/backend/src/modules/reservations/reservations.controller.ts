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
import { AddReservationRoomDto } from './dto/add-reservation-room.dto';
import { AvailabilitySearchQueryDto } from './dto/availability-search-query.dto';
import { BookingCalendarQueryDto } from './dto/booking-calendar-query.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { GetReservationsQueryDto } from './dto/get-reservations-query.dto';
import { MarkNoShowDto } from './dto/mark-no-show.dto';
import { UpdateReservationRoomDto } from './dto/update-reservation-room.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
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

  @Get('availability/search')
  @Permissions('availability.read')
  @ApiOperation({ summary: 'Search date-based availability' })
  @ApiOkResponse({ description: 'Available room types returned.' })
  @ApiBadRequestResponse({ description: 'Invalid availability date range.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Room type was not found.' })
  searchAvailability(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: AvailabilitySearchQueryDto,
  ) {
    return this.reservationsService.searchAvailability(currentUser, query);
  }

  @Get('availability/by-room-type')
  @Permissions('availability.read')
  @ApiOperation({ summary: 'Get date-based availability by room type' })
  @ApiOkResponse({ description: 'Room type availability returned.' })
  @ApiBadRequestResponse({ description: 'Invalid availability date range.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Room type was not found.' })
  getAvailabilityByRoomType(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: AvailabilitySearchQueryDto,
  ) {
    return this.reservationsService.getAvailabilityByRoomType(
      currentUser,
      query,
    );
  }

  @Get('availability/rooms')
  @Permissions('availability.read')
  @ApiOperation({ summary: 'List available rooms for a date range' })
  @ApiOkResponse({ description: 'Available rooms returned.' })
  @ApiBadRequestResponse({ description: 'Invalid availability date range.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Room type was not found.' })
  listAvailableRooms(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: AvailabilitySearchQueryDto,
  ) {
    return this.reservationsService.listAvailableRooms(currentUser, query);
  }

  @Get('calendar')
  @Permissions('booking_calendar.read')
  @ApiOperation({ summary: 'Get reservation booking calendar' })
  @ApiOkResponse({ description: 'Booking calendar returned.' })
  @ApiBadRequestResponse({ description: 'Invalid calendar date range.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  getBookingCalendar(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: BookingCalendarQueryDto,
  ) {
    return this.reservationsService.getBookingCalendar(currentUser, query);
  }

  @Get()
  @Permissions('reservations.read')
  @ApiOperation({ summary: 'List reservations' })
  @ApiOkResponse({ description: 'Reservations returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetReservationsQueryDto,
  ) {
    return this.reservationsService.list(currentUser, query);
  }

  @Get(':id')
  @Permissions('reservations.read')
  @ApiOperation({ summary: 'Get one reservation' })
  @ApiOkResponse({ description: 'Reservation returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Reservation was not found.' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) reservationId: number,
  ) {
    return this.reservationsService.getById(currentUser, reservationId);
  }

  @Patch(':id')
  @Permissions('reservations.update')
  @ApiOperation({ summary: 'Update one reservation' })
  @ApiOkResponse({ description: 'Reservation updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid reservation payload.' })
  @ApiConflictResponse({
    description: 'Reservation cannot be updated in its current status.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Reservation, guest, room type, or room was not found.',
  })
  update(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) reservationId: number,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(
      currentUser,
      reservationId,
      updateReservationDto,
    );
  }

  @Patch(':id/confirm')
  @Permissions('reservations.confirm')
  @ApiOperation({ summary: 'Confirm a draft reservation' })
  @ApiOkResponse({ description: 'Reservation confirmed successfully.' })
  @ApiConflictResponse({
    description: 'Reservation cannot be confirmed in its current status.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Reservation was not found.' })
  confirm(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) reservationId: number,
  ) {
    return this.reservationsService.confirm(currentUser, reservationId);
  }

  @Patch(':id/cancel')
  @Permissions('reservations.cancel')
  @ApiOperation({ summary: 'Cancel a reservation' })
  @ApiOkResponse({ description: 'Reservation cancelled successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid cancellation payload.' })
  @ApiConflictResponse({
    description: 'Reservation cannot be cancelled in its current status.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Reservation was not found.' })
  cancel(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) reservationId: number,
    @Body() cancelReservationDto: CancelReservationDto,
  ) {