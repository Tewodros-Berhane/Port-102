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

  @Patch('tasks/:id/assign')
  @Permissions('housekeeping.tasks.assign')
  @ApiOperation({ summary: 'Assign a housekeeping task' })
  @ApiOkResponse({ description: 'Housekeeping task assigned.' })
  @ApiBadRequestResponse({ description: 'Invalid assignment payload.' })
  @ApiConflictResponse({
    description: 'Task cannot be assigned in its current state.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Housekeeping task or assigned user was not found.',
  })
  assignTask(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) taskId: number,
    @Body() assignHousekeepingTaskDto: AssignHousekeepingTaskDto,
  ) {
    return this.housekeepingService.assign(
      currentUser,
      taskId,
      assignHousekeepingTaskDto,
    );
  }

  @Patch('tasks/:id/reassign')
  @Permissions('housekeeping.tasks.reassign')
  @ApiOperation({ summary: 'Reassign a housekeeping task' })
  @ApiOkResponse({ description: 'Housekeeping task reassigned.' })
  @ApiBadRequestResponse({ description: 'Invalid reassignment payload.' })
  @ApiConflictResponse({
    description: 'Task cannot be reassigned in its current state.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Housekeeping task or assigned user was not found.',
  })
  reassignTask(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) taskId: number,
    @Body() reassignHousekeepingTaskDto: ReassignHousekeepingTaskDto,
  ) {
    return this.housekeepingService.reassign(
      currentUser,
      taskId,
      reassignHousekeepingTaskDto,
    );
  }

  @Patch('tasks/:id/start')
  @AnyPermissions(
    'housekeeping.tasks.start',
    'housekeeping.tasks.start.assigned',
  )
  @ApiOperation({ summary: 'Start a housekeeping task' })
  @ApiOkResponse({ description: 'Housekeeping task started.' })
  @ApiBadRequestResponse({ description: 'Invalid start payload.' })
  @ApiConflictResponse({
    description: 'Task cannot be started in its current state.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({
    description: 'Missing permission or task is not assigned to current user.',
  })
  @ApiNotFoundResponse({ description: 'Housekeeping task was not found.' })
  startTask(
    @CurrentUser() currentUser: CurrentUserPayload,
    @CurrentPermissions() permissionKeys: string[],
    @Param('id', ParseIntPipe) taskId: number,
    @Body() startHousekeepingTaskDto: StartHousekeepingTaskDto,
  ) {
    return this.housekeepingService.start(
      currentUser,
      permissionKeys,
      taskId,
      startHousekeepingTaskDto,
    );
  }

  @Patch('tasks/:id/complete')
  @AnyPermissions(
    'housekeeping.tasks.complete',
    'housekeeping.tasks.complete.assigned',
  )
  @ApiOperation({ summary: 'Complete a housekeeping task' })
  @ApiOkResponse({
    description:
      'Housekeeping task completed and room cleaning status set to clean.',
  })
  @ApiBadRequestResponse({ description: 'Invalid completion payload.' })
  @ApiConflictResponse({
    description: 'Task cannot be completed in its current state.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({
    description: 'Missing permission or task is not assigned to current user.',
  })
  @ApiNotFoundResponse({ description: 'Housekeeping task was not found.' })
  completeTask(
    @CurrentUser() currentUser: CurrentUserPayload,
    @CurrentPermissions() permissionKeys: string[],
    @Param('id', ParseIntPipe) taskId: number,
    @Body() completeHousekeepingTaskDto: CompleteHousekeepingTaskDto,
  ) {
    return this.housekeepingService.complete(
      currentUser,
      permissionKeys,
      taskId,
      completeHousekeepingTaskDto,
    );
  }

  @Patch('tasks/:id/cancel')
  @AnyPermissions('housekeeping.tasks.assign', 'housekeeping.tasks.reassign')
  @ApiOperation({ summary: 'Cancel a housekeeping task' })
  @ApiOkResponse({ description: 'Housekeeping task cancelled.' })
  @ApiBadRequestResponse({ description: 'Invalid cancellation payload.' })
  @ApiConflictResponse({
    description: 'Task cannot be cancelled in its current state.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Housekeeping task was not found.' })
  cancelTask(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) taskId: number,
    @Body() cancelHousekeepingTaskDto: CancelHousekeepingTaskDto,
  ) {
    return this.housekeepingService.cancel(
      currentUser,
      taskId,
      cancelHousekeepingTaskDto,
    );
  }
}
