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
import { CreateRoomAmenityDto } from './dto/create-room-amenity.dto';
import { GetRoomAmenitiesQueryDto } from './dto/get-room-amenities-query.dto';
import { UpdateRoomAmenityDto } from './dto/update-room-amenity.dto';
import { RoomAmenitiesService } from './room-amenities.service';

@ApiTags('Room Amenities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('room-amenities')
export class RoomAmenitiesController {
  constructor(private readonly roomAmenitiesService: RoomAmenitiesService) {}

  @Post()
  @Permissions('room_amenities.create')
  @ApiOperation({ summary: 'Create a room amenity' })
  @ApiCreatedResponse({ description: 'Room amenity created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid room amenity payload.' })
  @ApiConflictResponse({ description: 'Amenity key already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  create(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createRoomAmenityDto: CreateRoomAmenityDto,
  ) {
    return this.roomAmenitiesService.create(currentUser, createRoomAmenityDto);
  }

  @Get()
  @Permissions('room_amenities.read')
  @ApiOperation({ summary: 'List room amenities' })
  @ApiOkResponse({ description: 'Room amenities returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetRoomAmenitiesQueryDto,
  ) {
    return this.roomAmenitiesService.list(currentUser, query);
  }

  @Get(':id')
  @Permissions('room_amenities.read')
  @ApiOperation({ summary: 'Get one room amenity' })
  @ApiOkResponse({ description: 'Room amenity returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Room amenity was not found.' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) amenityId: number,
  ) {
    return this.roomAmenitiesService.getById(currentUser, amenityId);
  }

  @Patch(':id')
  @Permissions('room_amenities.update')
  @ApiOperation({ summary: 'Update one room amenity' })
  @ApiOkResponse({ description: 'Room amenity updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid room amenity payload.' })
  @ApiConflictResponse({ description: 'Amenity key already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Room amenity was not found.' })
  update(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) amenityId: number,
    @Body() updateRoomAmenityDto: UpdateRoomAmenityDto,
  ) {
    return this.roomAmenitiesService.update(
      currentUser,
      amenityId,
      updateRoomAmenityDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions('room_amenities.delete')
  @ApiOperation({ summary: 'Deactivate one room amenity' })
  @ApiOkResponse({ description: 'Room amenity deactivated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Room amenity was not found.' })
  remove(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) amenityId: number,
  ) {
    return this.roomAmenitiesService.remove(currentUser, amenityId);
  }
}
