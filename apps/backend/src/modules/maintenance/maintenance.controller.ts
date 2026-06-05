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

import { CurrentPermissions } from '../../common/decorators/current-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AnyPermissions,
  Permissions,
} from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AssignMaintenanceTicketDto } from './dto/assign-maintenance-ticket.dto';
import { ApproveMaintenanceTicketDto } from './dto/approve-maintenance-ticket.dto';
import { CancelMaintenanceTicketDto } from './dto/cancel-maintenance-ticket.dto';
import { ClearRoomMaintenanceDto } from './dto/clear-room-maintenance.dto';
import { CompleteMaintenanceTicketDto } from './dto/complete-maintenance-ticket.dto';
import { CreateMaintenanceTicketDto } from './dto/create-maintenance-ticket.dto';
import { GetMaintenanceTicketsQueryDto } from './dto/get-maintenance-tickets-query.dto';
import { MarkRoomOutOfOrderFromMaintenanceDto } from './dto/mark-room-out-of-order-from-maintenance.dto';
import { MarkRoomUnderMaintenanceDto } from './dto/mark-room-under-maintenance.dto';
import { RejectMaintenanceTicketDto } from './dto/reject-maintenance-ticket.dto';
import { StartMaintenanceTicketDto } from './dto/start-maintenance-ticket.dto';
import { UpdateMaintenanceTicketDto } from './dto/update-maintenance-ticket.dto';
import { MaintenanceService } from './maintenance.service';

@ApiTags('Maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post('tickets')
  @Permissions('maintenance.tickets.create')
  @ApiOperation({ summary: 'Create a maintenance ticket' })
  @ApiCreatedResponse({ description: 'Maintenance ticket created.' })
  @ApiBadRequestResponse({ description: 'Invalid ticket payload.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Room, asset, or assigned user was not found.',
  })
  createTicket(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createMaintenanceTicketDto: CreateMaintenanceTicketDto,
  ) {
    return this.maintenanceService.createTicket(
      currentUser,
      createMaintenanceTicketDto,
    );
  }

  @Get('tickets')
  @Permissions('maintenance.tickets.read')
  @ApiOperation({ summary: 'List maintenance tickets' })
  @ApiOkResponse({ description: 'Maintenance tickets returned.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listTickets(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetMaintenanceTicketsQueryDto,
  ) {
    return this.maintenanceService.listTickets(currentUser, query);
  }

  @Get('tickets/assigned/me')
  @AnyPermissions(
    'maintenance.tickets.read',
    'maintenance.tickets.read.assigned',
  )
  @ApiOperation({ summary: 'List maintenance tickets assigned to current user' })
  @ApiOkResponse({ description: 'Assigned maintenance tickets returned.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listAssignedToMe(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetMaintenanceTicketsQueryDto,
  ) {
    return this.maintenanceService.listAssignedToMe(currentUser, query);
  }

  @Get('tickets/:id')
  @Permissions('maintenance.tickets.read')
  @ApiOperation({ summary: 'Get one maintenance ticket' })
  @ApiOkResponse({ description: 'Maintenance ticket returned.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Maintenance ticket was not found.' })
  getTicketById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) ticketId: number,
  ) {
    return this.maintenanceService.getTicketById(currentUser, ticketId);
  }

  @Patch('tickets/:id')
  @AnyPermissions(
    'maintenance.tickets.update',
    'maintenance.tickets.update.assigned',
  )
  @ApiOperation({ summary: 'Update maintenance ticket details' })
  @ApiOkResponse({ description: 'Maintenance ticket updated.' })
  @ApiBadRequestResponse({ description: 'Invalid ticket update payload.' })
  @ApiConflictResponse({
    description: 'Ticket cannot be updated in its current state.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({
    description: 'Missing permission or ticket is not assigned to current user.',
  })
  @ApiNotFoundResponse({
    description: 'Maintenance ticket, room, or asset was not found.',
  })
  updateTicket(
    @CurrentUser() currentUser: CurrentUserPayload,
    @CurrentPermissions() permissionKeys: string[],
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() updateMaintenanceTicketDto: UpdateMaintenanceTicketDto,
  ) {
    return this.maintenanceService.updateTicket(
      currentUser,
      permissionKeys,
      ticketId,
      updateMaintenanceTicketDto,
    );
  }

  @Patch('tickets/:id/assign')
  @Permissions('maintenance.tickets.assign')
  @ApiOperation({ summary: 'Assign a maintenance ticket to a technician' })
  @ApiOkResponse({ description: 'Maintenance ticket assigned.' })
  @ApiBadRequestResponse({ description: 'Invalid assignment payload.' })
  @ApiConflictResponse({
    description: 'Ticket cannot be assigned in its current state.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Maintenance ticket or assigned user was not found.',
  })
  assignTicket(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) ticketId: number,
    @Body() assignMaintenanceTicketDto: AssignMaintenanceTicketDto,
  ) {
    return this.maintenanceService.assignTicket(
      currentUser,
      ticketId,
      assignMaintenanceTicketDto,
    );
  }


}
