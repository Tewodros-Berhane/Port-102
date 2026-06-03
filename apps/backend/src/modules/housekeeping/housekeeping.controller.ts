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
import { ApproveHousekeepingTaskDto } from './dto/approve-housekeeping-task.dto';
import { CancelHousekeepingIssueDto } from './dto/cancel-housekeeping-issue.dto';
import { CancelHousekeepingTaskDto } from './dto/cancel-housekeeping-task.dto';
import { CompleteHousekeepingTaskDto } from './dto/complete-housekeeping-task.dto';
import { CreateHousekeepingIssueDto } from './dto/create-housekeeping-issue.dto';
import { CreateHousekeepingTaskDto } from './dto/create-housekeeping-task.dto';
import { GetHousekeepingIssuesQueryDto } from './dto/get-housekeeping-issues-query.dto';
import { GetHousekeepingTasksQueryDto } from './dto/get-housekeeping-tasks-query.dto';
import { HousekeepingDashboardQueryDto } from './dto/housekeeping-dashboard-query.dto';
import { HousekeepingProductivityQueryDto } from './dto/housekeeping-productivity-query.dto';
import { InspectHousekeepingTaskDto } from './dto/inspect-housekeeping-task.dto';
import { ReassignHousekeepingTaskDto } from './dto/reassign-housekeeping-task.dto';
import { RejectHousekeepingTaskDto } from './dto/reject-housekeeping-task.dto';
import { ResolveHousekeepingIssueDto } from './dto/resolve-housekeeping-issue.dto';
import { StartHousekeepingTaskDto } from './dto/start-housekeeping-task.dto';
import { UpdateHousekeepingTaskDto } from './dto/update-housekeeping-task.dto';
import { UpdateRoomCleaningStatusDto } from './dto/update-room-cleaning-status.dto';
import { HousekeepingService } from './housekeeping.service';

@ApiTags('Housekeeping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('housekeeping')
export class HousekeepingController {
  constructor(private readonly housekeepingService: HousekeepingService) {}

  @Get('dashboard')
  @Permissions('housekeeping.dashboard.read')
  @ApiOperation({ summary: 'Get housekeeping dashboard counts' })
  @ApiOkResponse({ description: 'Housekeeping dashboard counts returned.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  getDashboard(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: HousekeepingDashboardQueryDto,
  ) {
    return this.housekeepingService.getDashboard(currentUser, query);
  }

  @Get('productivity')
  @Permissions('housekeeping.productivity.read')
  @ApiOperation({ summary: 'Get housekeeping productivity summaries' })
  @ApiOkResponse({
    description: 'Housekeeping productivity summaries returned.',
  })
  @ApiBadRequestResponse({ description: 'Invalid productivity date range.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  getProductivity(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: HousekeepingProductivityQueryDto,
  ) {
    return this.housekeepingService.getProductivity(currentUser, query);
  }

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

  @Post('issues')
  @Permissions('housekeeping.issues.report')
  @ApiOperation({ summary: 'Report a housekeeping issue' })
  @ApiCreatedResponse({ description: 'Housekeeping issue reported.' })
  @ApiBadRequestResponse({ description: 'Invalid issue payload.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({
    description: 'Room or linked housekeeping task was not found.',
  })
  reportIssue(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createHousekeepingIssueDto: CreateHousekeepingIssueDto,
  ) {
    return this.housekeepingService.reportIssue(
      currentUser,
      createHousekeepingIssueDto,
    );
  }

  @Get('issues')
  @Permissions('housekeeping.issues.read')
  @ApiOperation({ summary: 'List housekeeping issues' })
  @ApiOkResponse({ description: 'Housekeeping issues returned.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listIssues(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetHousekeepingIssuesQueryDto,
  ) {
    return this.housekeepingService.listIssues(currentUser, query);
  }

  @Get('issues/:id')
  @Permissions('housekeeping.issues.read')
  @ApiOperation({ summary: 'Get one housekeeping issue' })
  @ApiOkResponse({ description: 'Housekeeping issue returned.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Housekeeping issue was not found.' })
  getIssueById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) issueId: number,
  ) {
    return this.housekeepingService.getIssueById(currentUser, issueId);
  }

  @Patch('issues/:id/resolve')
  @Permissions('housekeeping.issues.read')
  @ApiOperation({ summary: 'Resolve a housekeeping issue' })
  @ApiOkResponse({ description: 'Housekeeping issue resolved.' })
  @ApiBadRequestResponse({ description: 'Invalid issue resolution payload.' })
  @ApiConflictResponse({
    description: 'Issue cannot be resolved in its current state.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Housekeeping issue was not found.' })
  resolveIssue(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) issueId: number,
    @Body() resolveHousekeepingIssueDto: ResolveHousekeepingIssueDto,
  ) {
    return this.housekeepingService.resolveIssue(
      currentUser,
      issueId,
      resolveHousekeepingIssueDto,
    );
  }

  @Patch('issues/:id/cancel')
  @Permissions('housekeeping.issues.read')
  @ApiOperation({ summary: 'Cancel a housekeeping issue' })
  @ApiOkResponse({ description: 'Housekeeping issue cancelled.' })
  @ApiBadRequestResponse({ description: 'Invalid issue cancellation payload.' })
  @ApiConflictResponse({
    description: 'Issue cannot be cancelled in its current state.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Housekeeping issue was not found.' })
  cancelIssue(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) issueId: number,
    @Body() cancelHousekeepingIssueDto: CancelHousekeepingIssueDto,
  ) {
    return this.housekeepingService.cancelIssue(
      currentUser,
      issueId,
      cancelHousekeepingIssueDto,
    );
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

  @Patch('rooms/:roomId/cleaning-status')
  @AnyPermissions(
    'room_cleaning_status.update',
    'room_cleaning_status.update.assigned',
  )
  @ApiOperation({ summary: 'Update one room cleaning status' })
  @ApiOkResponse({ description: 'Room cleaning status updated.' })
  @ApiBadRequestResponse({ description: 'Invalid room cleaning payload.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({
    description: 'Missing permission or room is not assigned to current user.',
  })
  @ApiNotFoundResponse({ description: 'Room was not found.' })
  updateRoomCleaningStatus(
    @CurrentUser() currentUser: CurrentUserPayload,
    @CurrentPermissions() permissionKeys: string[],
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() updateRoomCleaningStatusDto: UpdateRoomCleaningStatusDto,
  ) {
    return this.housekeepingService.updateRoomCleaningStatus(
      currentUser,
      permissionKeys,
      roomId,
      updateRoomCleaningStatusDto,
    );
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
