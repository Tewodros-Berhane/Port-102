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
import { AssignRoomTypeAmenitiesDto } from './dto/assign-room-type-amenities.dto';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { GetRoomTypesQueryDto } from './dto/get-room-types-query.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { RoomTypesService } from './room-types.service';

@ApiTags('Room Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('room-types')
export class RoomTypesController {
  constructor(private readonly roomTypesService: RoomTypesService) {}

  @Post()
  @Permissions('room_types.create')
  @ApiOperation({ summary: 'Create a room type' })
  @ApiCreatedResponse({ description: 'Room type created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid room type payload.' })
  @ApiConflictResponse({ description: 'Room type code already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  create(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createRoomTypeDto: CreateRoomTypeDto,
  ) {
    return this.roomTypesService.create(currentUser, createRoomTypeDto);
  }

  @Get()
  @Permissions('room_types.read')
  @ApiOperation({ summary: 'List room types' })
  @ApiOkResponse({ description: 'Room types returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetRoomTypesQueryDto,
  ) {
    return this.roomTypesService.list(currentUser, query);
  }

  @Get(':id')
  @Permissions('room_types.read')
  @ApiOperation({ summary: 'Get one room type' })
  @ApiOkResponse({ description: 'Room type returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Room type was not found.' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) roomTypeId: number,
  ) {
    return this.roomTypesService.getById(currentUser, roomTypeId);
  }

  @Patch(':id')
  @Permissions('room_types.update')
  @ApiOperation({ summary: 'Update one room type' })
  @ApiOkResponse({ description: 'Room type updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid room type payload.' })
  @ApiConflictResponse({ description: 'Room type code already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Room type was not found.' })
  update(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) roomTypeId: number,
    @Body() updateRoomTypeDto: UpdateRoomTypeDto,
  ) {
    return this.roomTypesService.update(
      currentUser,
      roomTypeId,
      updateRoomTypeDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions('room_types.delete')
  @ApiOperation({ summary: 'Deactivate one room type' })
  @ApiOkResponse({ description: 'Room type deactivated successfully.' })
  @ApiBadRequestResponse({
    description: 'Room type has active rooms and cannot be deactivated.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Room type was not found.' })
  remove(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) roomTypeId: number,
  ) {
    return this.roomTypesService.remove(currentUser, roomTypeId);
  }

  @Post(':id/amenities')
  @Permissions('room_types.update')
  @ApiOperation({ summary: 'Assign amenities to a room type' })
  @ApiOkResponse({ description: 'Amenities assigned successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid amenity assignment.' })
  @ApiConflictResponse({
    description: 'One or more amenities are already assigned.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Room type or amenity was not found.' })
  assignAmenities(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) roomTypeId: number,
    @Body() assignRoomTypeAmenitiesDto: AssignRoomTypeAmenitiesDto,
  ) {
    return this.roomTypesService.assignAmenities(
      currentUser,
      roomTypeId,
      assignRoomTypeAmenitiesDto,
    );
  }

  @Delete(':id/amenities/:amenityId')
  @HttpCode(HttpStatus.OK)
  @Permissions('room_types.update')
  @ApiOperation({ summary: 'Remove one amenity from a room type' })
  @ApiOkResponse({ description: 'Amenity removed successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Room type, amenity, or assignment was not found.',
  })
  removeAmenity(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) roomTypeId: number,
    @Param('amenityId', ParseIntPipe) amenityId: number,
  ) {
    return this.roomTypesService.removeAmenity(
      currentUser,
      roomTypeId,
      amenityId,
    );
  }
}
