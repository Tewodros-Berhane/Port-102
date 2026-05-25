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
