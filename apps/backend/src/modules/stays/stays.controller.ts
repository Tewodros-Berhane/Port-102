import {
  Body,
  Controller,
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
import { FoliosService } from '../folios/folios.service';
import { AssignStayRoomDto } from './dto/assign-stay-room.dto';
import { CheckOutStayDto } from './dto/check-out-stay.dto';
import { ExtendStayDto } from './dto/extend-stay.dto';
import { GetStaysQueryDto } from './dto/get-stays-query.dto';
import { MoveRoomDto } from './dto/move-room.dto';
import { UpdateStayRoomAssignmentDto } from './dto/update-stay-room-assignment.dto';
import { StaysService } from './stays.service';

@ApiTags('Stays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stays')
export class StaysController {
  constructor(
    private readonly staysService: StaysService,
    private readonly foliosService: FoliosService,
  ) {}

  @Get('active/list')
  @Permissions('reservations.read')
  @ApiOperation({ summary: 'List active stays' })
  @ApiOkResponse({ description: 'Active stays returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listActive(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetStaysQueryDto,
  ) {
    return this.staysService.listActive(currentUser, query);
  }

  @Get('in-house/guests')
  @Permissions('in_house_guests.read')
  @ApiOperation({ summary: 'List in-house guests' })
  @ApiOkResponse({ description: 'In-house guests returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listInHouseGuests(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetStaysQueryDto,
  ) {
    return this.staysService.listInHouseGuests(currentUser, query);
  }

  @Get()
  @Permissions('reservations.read')
  @ApiOperation({ summary: 'List stays' })
  @ApiOkResponse({ description: 'Stays returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetStaysQueryDto,
  ) {
    return this.staysService.list(currentUser, query);
  }

  @Get(':id')
  @Permissions('reservations.read')
  @ApiOperation({ summary: 'Get one stay' })
  @ApiOkResponse({ description: 'Stay returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Stay was not found.' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) stayId: number,
  ) {
    return this.staysService.getById(currentUser, stayId);
  }

  @Post(':id/open-folio')
  @Permissions('folios.create')
  @ApiOperation({ summary: 'Open a folio for an active stay' })
  @ApiCreatedResponse({ description: 'Folio opened successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid folio request.' })
  @ApiConflictResponse({ description: 'Stay cannot open a folio.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Stay was not found.' })
  openFolio(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) stayId: number,
  ) {
    return this.foliosService.openForStay(currentUser, stayId);
  }

  @Post(':id/check-out')
  @HttpCode(HttpStatus.OK)
  @Permissions('check_out.execute')
  @ApiOperation({ summary: 'Check out an active stay' })
  @ApiOkResponse({ description: 'Stay checked out successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid checkout payload.' })
  @ApiConflictResponse({ description: 'Stay cannot be checked out.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Stay was not found.' })
  checkOut(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) stayId: number,
    @Body() checkOutStayDto: CheckOutStayDto,
  ) {
    return this.staysService.checkOut(currentUser, stayId, checkOutStayDto);
  }

  @Post(':id/rooms')
  @Permissions('room_assignment.create')
  @ApiOperation({ summary: 'Assign a room to an active stay' })
  @ApiCreatedResponse({ description: 'Room assigned to stay successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid room assignment payload.' })
  @ApiConflictResponse({ description: 'Room cannot be assigned to the stay.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Stay, room, or reservation room was not found.',
  })
  assignRoom(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) stayId: number,
    @Body() assignStayRoomDto: AssignStayRoomDto,
  ) {
    return this.staysService.assignRoom(currentUser, stayId, assignStayRoomDto);
  }

  @Patch(':id/rooms/:assignmentId')
  @Permissions('room_assignment.update')
  @ApiOperation({ summary: 'Update an active stay room assignment' })
  @ApiOkResponse({ description: 'Stay room assignment updated successfully.' })
  @ApiBadRequestResponse({
    description: 'Invalid room assignment update payload.',
  })
  @ApiConflictResponse({ description: 'Room assignment cannot be updated.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Stay or room assignment was not found.',
  })
  updateRoomAssignment(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) stayId: number,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() updateStayRoomAssignmentDto: UpdateStayRoomAssignmentDto,
  ) {
    return this.staysService.updateRoomAssignment(
      currentUser,
      stayId,
      assignmentId,
      updateStayRoomAssignmentDto,
    );
  }

  @Post(':id/room-move')
  @Permissions('room_move.execute')
  @ApiOperation({ summary: 'Move an active stay from one room to another' })
  @ApiCreatedResponse({ description: 'Stay room moved successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid room move payload.' })
  @ApiConflictResponse({ description: 'Stay room cannot be moved.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Stay, assignment, or room was not found.',
  })
  moveRoom(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) stayId: number,
    @Body() moveRoomDto: MoveRoomDto,
  ) {
    return this.staysService.moveRoom(currentUser, stayId, moveRoomDto);
  }

  @Patch(':id/extend')
  @Permissions('stay_extension.execute')
  @ApiOperation({ summary: 'Extend an active stay checkout date' })
  @ApiOkResponse({ description: 'Stay extended successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid stay extension payload.' })
  @ApiConflictResponse({ description: 'Stay cannot be extended.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Stay was not found.' })
  extendStay(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) stayId: number,
    @Body() extendStayDto: ExtendStayDto,
  ) {
    return this.staysService.extendStay(currentUser, stayId, extendStayDto);
  }
}
