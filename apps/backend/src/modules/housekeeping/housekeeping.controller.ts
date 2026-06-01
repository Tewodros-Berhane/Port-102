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
import { AssignHousekeepingTaskDto } from './dto/assign-housekeeping-task.dto';
import { CancelHousekeepingTaskDto } from './dto/cancel-housekeeping-task.dto';
import { CreateHousekeepingTaskDto } from './dto/create-housekeeping-task.dto';
import { GetHousekeepingTasksQueryDto } from './dto/get-housekeeping-tasks-query.dto';
import { ReassignHousekeepingTaskDto } from './dto/reassign-housekeeping-task.dto';
import { CompleteHousekeepingTaskDto } from './dto/complete-housekeeping-task.dto';
import { StartHousekeepingTaskDto } from './dto/start-housekeeping-task.dto';
import { UpdateHousekeepingTaskDto } from './dto/update-housekeeping-task.dto';
import { HousekeepingService } from './housekeeping.service';

@ApiTags('Housekeeping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('housekeeping')
export class HousekeepingController {
  constructor(private readonly housekeepingService: HousekeepingService) {}

  @Post('tasks')
  @Permissions('housekeeping.tasks.create')
  @ApiOperation({ summary: 'Create a housekeeping task' })
  @ApiCreatedResponse({ description: 'Housekeeping task created.' })
  @ApiBadRequestResponse({ description: 'Invalid task payload.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Room or assigned user was not found.',
  })
  createTask(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createHousekeepingTaskDto: CreateHousekeepingTaskDto,
  ) {
    return this.housekeepingService.create(
      currentUser,
      createHousekeepingTaskDto,
    );
  }

  @Get('tasks')
  @Permissions('housekeeping.tasks.read')
  @ApiOperation({ summary: 'List housekeeping tasks' })
  @ApiOkResponse({ description: 'Housekeeping tasks returned.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listTasks(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetHousekeepingTasksQueryDto,
  ) {
    return this.housekeepingService.list(currentUser, query);
  }

  @Get('tasks/assigned/me')
  @AnyPermissions('housekeeping.tasks.read', 'housekeeping.tasks.read.assigned')
  @ApiOperation({ summary: 'List housekeeping tasks assigned to current user' })
  @ApiOkResponse({ description: 'Assigned housekeeping tasks returned.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listMyAssignedTasks(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetHousekeepingTasksQueryDto,
  ) {
    return this.housekeepingService.listAssignedToMe(currentUser, query);
  }

  @Get('tasks/:id')
  @Permissions('housekeeping.tasks.read')
  @ApiOperation({ summary: 'Get one housekeeping task' })
  @ApiOkResponse({ description: 'Housekeeping task returned.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Housekeeping task was not found.' })
  getTaskById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) taskId: number,
  ) {
    return this.housekeepingService.getById(currentUser, taskId);
  }

  @Patch('tasks/:id')
  @AnyPermissions(
    'housekeeping.tasks.create',
    'housekeeping.tasks.assign',
    'housekeeping.tasks.reassign',
  )
  @ApiOperation({ summary: 'Update housekeeping task details' })
  @ApiOkResponse({ description: 'Housekeeping task updated.' })
  @ApiBadRequestResponse({ description: 'Invalid task payload.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Housekeeping task or room was not found.',
  })
  updateTask(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) taskId: number,
    @Body() updateHousekeepingTaskDto: UpdateHousekeepingTaskDto,
  ) {
    return this.housekeepingService.update(
      currentUser,
      taskId,
      updateHousekeepingTaskDto,
    );
  }

