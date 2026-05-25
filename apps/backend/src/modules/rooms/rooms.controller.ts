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
import { ClearRoomOutOfOrderDto } from './dto/clear-room-out-of-order.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { GetRoomStatusLogsQueryDto } from './dto/get-room-status-logs-query.dto';
import { GetRoomsQueryDto } from './dto/get-rooms-query.dto';
import { MarkRoomOutOfOrderDto } from './dto/mark-room-out-of-order.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';

@ApiTags('Rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @Permissions('rooms.create')
  @ApiOperation({ summary: 'Create a room' })
  @ApiCreatedResponse({ description: 'Room created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid room payload.' })
  @ApiConflictResponse({ description: 'Room number already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Floor or room type was not found.' })
  create(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createRoomDto: CreateRoomDto,
  ) {
    return this.roomsService.create(currentUser, createRoomDto);
  }

  @Get()
  @Permissions('rooms.read')
  @ApiOperation({ summary: 'List rooms' })
  @ApiOkResponse({ description: 'Rooms returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetRoomsQueryDto,
  ) {
    return this.roomsService.list(currentUser, query);
  }

  @Get('availability/summary')
  @Permissions('rooms.availability.read')
  @ApiOperation({ summary: 'Get room availability summary' })
  @ApiOkResponse({ description: 'Room availability summary returned.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  getAvailabilitySummary(@CurrentUser() currentUser: CurrentUserPayload) {
    return this.roomsService.getAvailabilitySummary(currentUser);
  }

  @Get('status/summary')
  @Permissions('rooms.status.read')
  @ApiOperation({ summary: 'Get room status summary' })
  @ApiOkResponse({ description: 'Room status summary returned.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  getStatusSummary(@CurrentUser() currentUser: CurrentUserPayload) {
    return this.roomsService.getStatusSummary(currentUser);
  }

  @Get(':id/status-logs')
  @Permissions('rooms.status.read')
  @ApiOperation({ summary: 'List status changes for one room' })
  @ApiOkResponse({ description: 'Room status logs returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Room was not found.' })
  listStatusLogs(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) roomId: number,
    @Query() query: GetRoomStatusLogsQueryDto,
  ) {
    return this.roomsService.listStatusLogs(currentUser, roomId, query);
  }

  @Get(':id')
  @Permissions('rooms.read')
  @ApiOperation({ summary: 'Get one room' })
  @ApiOkResponse({ description: 'Room returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Room was not found.' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) roomId: number,
  ) {
    return this.roomsService.getById(currentUser, roomId);
  }

  @Patch(':id')
  @Permissions('rooms.update')
  @ApiOperation({ summary: 'Update one room' })
  @ApiOkResponse({ description: 'Room updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid room payload.' })
  @ApiConflictResponse({ description: 'Room number already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Room, floor, or room type was not found.',
  })
  update(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) roomId: number,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    return this.roomsService.update(currentUser, roomId, updateRoomDto);
  }

  @Patch(':id/status')
