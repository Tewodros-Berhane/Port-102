import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  HousekeepingIssueStatus,
  HousekeepingPriority,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  Prisma,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import {
  RoomRecord,
  RoomsRepository,
} from '../rooms/repositories/rooms.repository';
import { AssignHousekeepingTaskDto } from './dto/assign-housekeeping-task.dto';
import { ApproveHousekeepingTaskDto } from './dto/approve-housekeeping-task.dto';
import { CancelHousekeepingTaskDto } from './dto/cancel-housekeeping-task.dto';
import { CancelHousekeepingIssueDto } from './dto/cancel-housekeeping-issue.dto';
import { CompleteHousekeepingTaskDto } from './dto/complete-housekeeping-task.dto';
import { CreateHousekeepingTaskDto } from './dto/create-housekeeping-task.dto';
import { CreateHousekeepingIssueDto } from './dto/create-housekeeping-issue.dto';
import { GetHousekeepingIssuesQueryDto } from './dto/get-housekeeping-issues-query.dto';
import { GetHousekeepingTasksQueryDto } from './dto/get-housekeeping-tasks-query.dto';
import { HousekeepingDashboardQueryDto } from './dto/housekeeping-dashboard-query.dto';
import { HousekeepingProductivityQueryDto } from './dto/housekeeping-productivity-query.dto';
import { InspectHousekeepingTaskDto } from './dto/inspect-housekeeping-task.dto';
import { ReassignHousekeepingTaskDto } from './dto/reassign-housekeeping-task.dto';
import { RejectHousekeepingTaskDto } from './dto/reject-housekeeping-task.dto';
import { ResolveHousekeepingIssueDto } from './dto/resolve-housekeeping-issue.dto';
import { StartHousekeepingTaskDto } from './dto/start-housekeeping-task.dto';
import { UpdateRoomCleaningStatusDto } from './dto/update-room-cleaning-status.dto';
import { UpdateHousekeepingTaskDto } from './dto/update-housekeeping-task.dto';
import {
  HousekeepingIssueRecord,
  HousekeepingIssuesRepository,
} from './repositories/housekeeping-issues.repository';
import {
  ActiveHousekeepingUserRecord,
  HousekeepingProductivityTaskRecord,
  HousekeepingTaskRecord,
  HousekeepingTasksRepository,
} from './repositories/housekeeping-tasks.repository';

@Injectable()
export class HousekeepingService {
  constructor(
    private readonly housekeepingTasksRepository: HousekeepingTasksRepository,
    private readonly housekeepingIssuesRepository: HousekeepingIssuesRepository,
    private readonly roomsRepository: RoomsRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    currentUser: CurrentUserPayload,
    createHousekeepingTaskDto: CreateHousekeepingTaskDto,
  ) {
    const room = await this.ensureActiveRoom(createHousekeepingTaskDto.roomId);
    const assignedUser =
      createHousekeepingTaskDto.assignedToUserId === undefined
        ? null
        : await this.ensureActiveUser(
            createHousekeepingTaskDto.assignedToUserId,
          );
    const taskNumber = await this.generateTaskNumber();
    const task = await this.housekeepingTasksRepository.createTask({
      taskNumber,
      roomId: room.id,
      type:
        createHousekeepingTaskDto.type ??
        HousekeepingTaskType.CHECKOUT_CLEANING,
      status: assignedUser
        ? HousekeepingTaskStatus.ASSIGNED
        : HousekeepingTaskStatus.PENDING,
      priority:
        createHousekeepingTaskDto.priority ?? HousekeepingPriority.NORMAL,
      assignedToUserId: assignedUser?.id ?? null,
      assignedByUserId: assignedUser ? currentUser.sub : null,
      notes: this.normalizeOptionalString(createHousekeepingTaskDto.notes),
      sourceType: this.normalizeOptionalString(
        createHousekeepingTaskDto.sourceType,
      ),
      sourceId: createHousekeepingTaskDto.sourceId ?? null,
    });

    await this.recordTaskAudit(
      currentUser,
      'housekeeping.tasks.created',
      task,
      {
        taskNumber: task.taskNumber,
        roomId: task.roomId,
        type: task.type,
        priority: task.priority,
        assignedToUserId: task.assignedToUserId,
        sourceType: task.sourceType,
        sourceId: task.sourceId,
      },
    );

    return this.serializeTask(task);
  }

  async createCheckoutCleaningTaskFromStay({
    stayId,
    roomId,
    client,
  }: {
    stayId: number;
    roomId: number;
    client?: Prisma.TransactionClient;
  }) {
    const existingTask =
      await this.housekeepingTasksRepository.findOpenCheckoutCleaningTask(
        {
          roomId,
          sourceId: stayId,
        },
        client,
      );

    if (existingTask) {
      return {
        task: existingTask,
        created: false,
      };
    }

    const taskNumber = await this.generateTaskNumber(client);
    const task = await this.housekeepingTasksRepository.createTask(
      {
        taskNumber,
        roomId,
        type: HousekeepingTaskType.CHECKOUT_CLEANING,
        status: HousekeepingTaskStatus.PENDING,
        priority: HousekeepingPriority.NORMAL,
        sourceType: 'STAY_CHECKOUT',
        sourceId: stayId,
      },
      client,
    );

    return {
      task,
      created: true,
    };
  }

  async list(
    _currentUser: CurrentUserPayload,
    query: GetHousekeepingTasksQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, tasks] = await this.housekeepingTasksRepository.listTasks({
      skip: (page - 1) * limit,
      take: limit,
      search: search ?? undefined,
      status: query.status,
      type: query.type,
      priority: query.priority,
      roomId: query.roomId,
      assignedToUserId: query.assignedToUserId,
      createdFrom: this.parseOptionalDate(query.createdFrom),
      createdTo: this.parseOptionalDate(query.createdTo),
    });

    return {
      items: tasks.map((task) => this.serializeTask(task)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  listAssignedToMe(
    currentUser: CurrentUserPayload,
    query: GetHousekeepingTasksQueryDto,
  ) {
    return this.list(currentUser, {
      ...query,
      assignedToUserId: currentUser.sub,
    });
  }

  async reportIssue(
    currentUser: CurrentUserPayload,
    createHousekeepingIssueDto: CreateHousekeepingIssueDto,
  ) {
    const room = await this.ensureActiveRoom(
      createHousekeepingIssueDto.roomId,
      'Cannot report a housekeeping issue for an inactive room.',
    );
    const task =
      createHousekeepingIssueDto.taskId === undefined ||
      createHousekeepingIssueDto.taskId === null
        ? null
        : await this.findRequiredTask(createHousekeepingIssueDto.taskId);

    if (task && task.roomId !== room.id) {
      throw new BadRequestException(
        'Housekeeping issue task must belong to the selected room.',
      );
    }

    const title = this.normalizeRequiredString(
      createHousekeepingIssueDto.title,
      'Housekeeping issue title is required.',
    );
    const issueNumber = await this.generateIssueNumber();
    const issue = await this.housekeepingIssuesRepository.createIssue({
      issueNumber,
      roomId: room.id,
      taskId: task?.id ?? null,
      reportedByUserId: currentUser.sub,
      status: HousekeepingIssueStatus.OPEN,
      title,
      description: this.normalizeOptionalString(
        createHousekeepingIssueDto.description,
      ),
      photoUrl: this.normalizeOptionalString(
        createHousekeepingIssueDto.photoUrl,
      ),
    });

    await this.recordIssueAudit(
      currentUser,
      'housekeeping.issues.reported',
      issue,
      {
        issueNumber: issue.issueNumber,
        roomId: issue.roomId,
        taskId: issue.taskId,
        status: issue.status,
        title: issue.title,
      },
    );
    // TODO: Emit a maintenance-ticket event once maintenance integration exists.

    return this.serializeIssue(issue);
  }

  async listIssues(
    _currentUser: CurrentUserPayload,
    query: GetHousekeepingIssuesQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, issues] = await this.housekeepingIssuesRepository.listIssues({
      skip: (page - 1) * limit,
      take: limit,
      search: search ?? undefined,
      status: query.status,
      roomId: query.roomId,
      taskId: query.taskId,
      reportedByUserId: query.reportedByUserId,
      createdFrom: this.parseOptionalDate(query.createdFrom),
      createdTo: this.parseOptionalDate(query.createdTo),
    });

    return {
      items: issues.map((issue) => this.serializeIssue(issue)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getIssueById(_currentUser: CurrentUserPayload, issueId: number) {
    const issue = await this.findRequiredIssue(issueId);

    return this.serializeIssue(issue);
  }

  async resolveIssue(
    currentUser: CurrentUserPayload,
    issueId: number,
    resolveHousekeepingIssueDto: ResolveHousekeepingIssueDto,
  ) {
    const issue = await this.findRequiredIssue(issueId);

    this.ensureIssueOpen(issue, 'resolved');

    const resolutionNotes = this.normalizeOptionalString(
      resolveHousekeepingIssueDto.resolutionNotes,
    );
    const resolvedIssue = await this.housekeepingIssuesRepository.updateIssue(
      issue.id,
      {
        status: HousekeepingIssueStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedByUserId: currentUser.sub,
        resolutionNotes,
      },
    );

    await this.recordIssueAudit(
      currentUser,
      'housekeeping.issues.resolved',
      resolvedIssue,
      {
        issueNumber: resolvedIssue.issueNumber,
        roomId: resolvedIssue.roomId,
        taskId: resolvedIssue.taskId,
        previousStatus: issue.status,
        status: resolvedIssue.status,
        resolutionNotes,
      },
    );

    return this.serializeIssue(resolvedIssue);
  }

  async cancelIssue(
    currentUser: CurrentUserPayload,
    issueId: number,
    cancelHousekeepingIssueDto: CancelHousekeepingIssueDto,
  ) {
    const issue = await this.findRequiredIssue(issueId);

    this.ensureIssueOpen(issue, 'cancelled');

    const reason = this.normalizeRequiredString(
      cancelHousekeepingIssueDto.reason,
      'Housekeeping issue cancellation reason is required.',
    );
    const cancelledIssue = await this.housekeepingIssuesRepository.updateIssue(
      issue.id,
      {
        status: HousekeepingIssueStatus.CANCELLED,
      },
    );

    await this.recordIssueAudit(
      currentUser,
      'housekeeping.issues.cancelled',
      cancelledIssue,
      {
        issueNumber: cancelledIssue.issueNumber,
        roomId: cancelledIssue.roomId,
        taskId: cancelledIssue.taskId,
        previousStatus: issue.status,
        status: cancelledIssue.status,
        reason,
      },
    );

    return this.serializeIssue(cancelledIssue);
  }

  async getById(_currentUser: CurrentUserPayload, taskId: number) {
    const task = await this.findRequiredTask(taskId);

    return this.serializeTask(task);
  }

  async getDashboard(
    _currentUser: CurrentUserPayload,
    query: HousekeepingDashboardQueryDto,
  ) {
    const { from, to } = this.getDayRange(query.date);
    const openTaskStatuses = [
      HousekeepingTaskStatus.PENDING,
      HousekeepingTaskStatus.ASSIGNED,
      HousekeepingTaskStatus.IN_PROGRESS,
      HousekeepingTaskStatus.INSPECTION_PENDING,
      HousekeepingTaskStatus.REJECTED,
    ];
    const [
      pendingTasks,
      assignedTasks,
      inProgressTasks,
      inspectionPendingTasks,
      approvedTasksToday,
      rejectedTasksToday,
      openIssues,
      dirtyRooms,
      cleanRooms,
      inspectedRooms,
      roomsOutOfOrder,
      urgentTasks,
    ] = await Promise.all([
      this.housekeepingTasksRepository.countTasks({
        status: HousekeepingTaskStatus.PENDING,
      }),
      this.housekeepingTasksRepository.countTasks({
        status: HousekeepingTaskStatus.ASSIGNED,
      }),
      this.housekeepingTasksRepository.countTasks({
        status: HousekeepingTaskStatus.IN_PROGRESS,
      }),
      this.housekeepingTasksRepository.countTasks({
        status: HousekeepingTaskStatus.INSPECTION_PENDING,
      }),
      this.housekeepingTasksRepository.countTasks({
        status: HousekeepingTaskStatus.APPROVED,
        approvedAt: {
          gte: from,
          lte: to,
        },
      }),
      this.housekeepingTasksRepository.countTasks({
        status: HousekeepingTaskStatus.REJECTED,
        rejectedAt: {
          gte: from,
          lte: to,
        },
      }),
      this.housekeepingIssuesRepository.countIssues({
        status: HousekeepingIssueStatus.OPEN,
      }),
      this.roomsRepository.countRooms({
        cleaningStatus: RoomCleaningStatus.DIRTY,
      }),
      this.roomsRepository.countRooms({
        cleaningStatus: RoomCleaningStatus.CLEAN,
      }),
      this.roomsRepository.countRooms({
        cleaningStatus: RoomCleaningStatus.INSPECTED,
      }),
      this.roomsRepository.countRooms({
        maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
      }),
      this.housekeepingTasksRepository.countTasks({
        priority: HousekeepingPriority.URGENT,
        status: {
          in: openTaskStatuses,
        },
      }),
    ]);

    return {
      date: from.toISOString().slice(0, 10),
      range: {
        from,
        to,
      },
      pendingTasks,
      assignedTasks,
      inProgressTasks,
      inspectionPendingTasks,
      approvedTasksToday,
      rejectedTasksToday,
      openIssues,
      dirtyRooms,
      cleanRooms,
      inspectedRooms,
      roomsOutOfOrder,
      urgentTasks,
    };
  }

  async getProductivity(
    _currentUser: CurrentUserPayload,
    query: HousekeepingProductivityQueryDto,
  ) {
    const { from, to } = this.getDateRange(query.from, query.to);
    const tasks =
      await this.housekeepingTasksRepository.listTasksForProductivity({
        from,
        to,
      });
    const summaries = new Map<
      number,
      {
        attendant: NonNullable<
          HousekeepingProductivityTaskRecord['assignedTo']
        >;
        assignedCount: number;
        completedCount: number;
        approvedCount: number;
        rejectedCount: number;
        completionMinutesTotal: number;
        completionDurationCount: number;
      }
    >();

    for (const task of tasks) {
      if (task.assignedToUserId === null || task.assignedTo === null) {
        continue;
      }

      const summary = this.getProductivitySummary(
        summaries,
        task.assignedToUserId,
        task.assignedTo,
      );

      if (this.isWithinRange(task.createdAt, from, to)) {
        summary.assignedCount += 1;
      }

      if (this.isWithinRange(task.completedAt, from, to)) {
        summary.completedCount += 1;

        if (task.startedAt && task.completedAt) {
          summary.completionMinutesTotal +=
            (task.completedAt.getTime() - task.startedAt.getTime()) / 60000;
          summary.completionDurationCount += 1;
        }
      }

      if (this.isWithinRange(task.approvedAt, from, to)) {
        summary.approvedCount += 1;
      }

      if (this.isWithinRange(task.rejectedAt, from, to)) {
        summary.rejectedCount += 1;
      }
    }

    return {
      range: {
        from,
        to,
      },
      items: [...summaries.values()]
        .sort((left, right) =>
          left.attendant.fullName.localeCompare(right.attendant.fullName),
        )
        .map((summary) => ({
          attendant: this.serializeUserSummary(summary.attendant),
          assignedCount: summary.assignedCount,
          completedCount: summary.completedCount,
          approvedCount: summary.approvedCount,
          rejectedCount: summary.rejectedCount,
          averageCompletionMinutes:
            summary.completionDurationCount === 0
              ? null
              : Number(
                  (
                    summary.completionMinutesTotal /
                    summary.completionDurationCount
                  ).toFixed(2),
                ),
        })),
    };
  }

  async updateRoomCleaningStatus(
    currentUser: CurrentUserPayload,
    permissionKeys: string[],
    roomId: number,
    updateRoomCleaningStatusDto: UpdateRoomCleaningStatusDto,
  ) {
    const room = await this.ensureActiveRoom(
      roomId,
      'Cannot update cleaning status for an inactive room.',
    );

    await this.ensureRoomCleaningStatusAccess({
      currentUser,
      permissionKeys,
      roomId: room.id,
    });

    if (room.cleaningStatus === updateRoomCleaningStatusDto.cleaningStatus) {
      return this.serializeRoom(room);
    }

    const reason = this.normalizeOptionalString(
      updateRoomCleaningStatusDto.reason,
    );
    const updatedRoom = await this.roomsRepository.updateRoom(room.id, {
      cleaningStatus: updateRoomCleaningStatusDto.cleaningStatus,
    });

    await this.roomsRepository.createStatusLogs([
      {
        roomId: room.id,
        actorUserId: currentUser.sub,
        field: 'cleaningStatus',
        oldValue: room.cleaningStatus,
        newValue: updatedRoom.cleaningStatus,
        reason,
      },
    ]);

    await this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action: 'room_cleaning_status.updated',
      entityType: 'Room',
      entityId: String(room.id),
      metadata: {
        roomId: room.id,
        previousCleaningStatus: room.cleaningStatus,
        cleaningStatus: updatedRoom.cleaningStatus,
        reason,
      },
    });

    return this.serializeRoom(updatedRoom);
  }

  async update(
    currentUser: CurrentUserPayload,
    taskId: number,
    updateHousekeepingTaskDto: UpdateHousekeepingTaskDto,
  ) {
    const task = await this.findRequiredTask(taskId);
    const data: Prisma.HousekeepingTaskUncheckedUpdateInput = {};

    if (updateHousekeepingTaskDto.roomId !== undefined) {
      const room = await this.ensureActiveRoom(
        updateHousekeepingTaskDto.roomId,
      );
      data.roomId = room.id;
    }

    if (updateHousekeepingTaskDto.type !== undefined) {
      data.type = updateHousekeepingTaskDto.type;
    }

    if (updateHousekeepingTaskDto.priority !== undefined) {
      data.priority = updateHousekeepingTaskDto.priority;
    }

    if (updateHousekeepingTaskDto.notes !== undefined) {
      data.notes = this.normalizeOptionalString(
        updateHousekeepingTaskDto.notes,
      );
    }

    if (updateHousekeepingTaskDto.sourceType !== undefined) {
      data.sourceType = this.normalizeOptionalString(
        updateHousekeepingTaskDto.sourceType,
      );
    }

    if (updateHousekeepingTaskDto.sourceId !== undefined) {
      data.sourceId = updateHousekeepingTaskDto.sourceId ?? null;
    }

    if (Object.keys(data).length === 0) {
      return this.serializeTask(task);
    }

    const updatedTask = await this.housekeepingTasksRepository.updateTask(
      task.id,
      data,
    );

    await this.recordTaskAudit(
      currentUser,
      'housekeeping.tasks.updated',
      updatedTask,
      {
        previous: this.taskAuditSnapshot(task),
        changes: this.serializeTaskUpdateData(data),
      },
    );

    return this.serializeTask(updatedTask);
  }

  async assign(
    currentUser: CurrentUserPayload,
    taskId: number,
    assignHousekeepingTaskDto: AssignHousekeepingTaskDto,
  ) {
    const task = await this.findRequiredTask(taskId);

    if (task.assignedToUserId !== null) {
      throw new ConflictException(
        'Task is already assigned. Use reassignment instead.',
      );
    }

    return this.assignTask({
      currentUser,
      task,
      assignedToUserId: assignHousekeepingTaskDto.assignedToUserId,
      notes: assignHousekeepingTaskDto.notes,
      auditAction: 'housekeeping.tasks.assigned',
      previousAssignedToUserId: null,
    });
  }

  async reassign(
    currentUser: CurrentUserPayload,
    taskId: number,
    reassignHousekeepingTaskDto: ReassignHousekeepingTaskDto,
  ) {
    const task = await this.findRequiredTask(taskId);

    if (task.assignedToUserId === null) {
      throw new ConflictException('Task must be assigned before reassignment.');
    }

    if (
      task.assignedToUserId === reassignHousekeepingTaskDto.assignedToUserId
    ) {
      throw new ConflictException('Task is already assigned to this user.');
    }

    return this.assignTask({
      currentUser,
      task,
      assignedToUserId: reassignHousekeepingTaskDto.assignedToUserId,
      notes: reassignHousekeepingTaskDto.notes,
      auditAction: 'housekeeping.tasks.reassigned',
      previousAssignedToUserId: task.assignedToUserId,
    });
  }

  async cancel(
    currentUser: CurrentUserPayload,
    taskId: number,
    cancelHousekeepingTaskDto: CancelHousekeepingTaskDto,
  ) {
    const task = await this.findRequiredTask(taskId);

    if (task.status === HousekeepingTaskStatus.CANCELLED) {
      throw new ConflictException('Task is already cancelled.');
    }

    if (task.status === HousekeepingTaskStatus.APPROVED) {
      throw new ConflictException('Approved tasks cannot be cancelled.');
    }

    const reason = this.normalizeRequiredString(
      cancelHousekeepingTaskDto.reason,
      'Task cancellation reason is required.',
    );
    const cancelledTask = await this.housekeepingTasksRepository.updateTask(
      task.id,
      {
        status: HousekeepingTaskStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledByUserId: currentUser.sub,
        cancellationReason: reason,
      },
    );

    await this.recordTaskAudit(
      currentUser,
      'housekeeping.tasks.cancelled',
      cancelledTask,
      {
        taskNumber: cancelledTask.taskNumber,
        roomId: cancelledTask.roomId,
        previousStatus: task.status,
        reason,
      },
    );

    return this.serializeTask(cancelledTask);
  }

  async start(
    currentUser: CurrentUserPayload,
    permissionKeys: string[],
    taskId: number,
    startHousekeepingTaskDto: StartHousekeepingTaskDto,
  ) {
    const task = await this.findRequiredTask(taskId);

    this.ensureAssignedOnlyTaskAccess({
      currentUser,
      permissionKeys,
      task,
      fullPermission: 'housekeeping.tasks.start',
      assignedPermission: 'housekeeping.tasks.start.assigned',
    });
    this.ensureTaskCanStart(task);

    const notes =
      startHousekeepingTaskDto.notes === undefined
        ? undefined
        : this.normalizeOptionalString(startHousekeepingTaskDto.notes);
    const startedTask = await this.housekeepingTasksRepository.updateTask(
      task.id,
      {
        status: HousekeepingTaskStatus.IN_PROGRESS,
        startedAt: new Date(),
        ...(task.status === HousekeepingTaskStatus.REJECTED
          ? {
              completedAt: null,
              inspectedAt: null,
              approvedAt: null,
              rejectedAt: null,
              completedByUserId: null,
              inspectedByUserId: null,
              approvedByUserId: null,
              rejectedByUserId: null,
              completionNotes: null,
              inspectionNotes: null,
              rejectionReason: null,
            }
          : {}),
        ...(notes === undefined ? {} : { notes }),
      },
    );

    await this.recordTaskAudit(
      currentUser,
      'housekeeping.tasks.started',
      startedTask,
      {
        taskNumber: startedTask.taskNumber,
        roomId: startedTask.roomId,
        previousStatus: task.status,
        status: startedTask.status,
        assignedToUserId: startedTask.assignedToUserId,
        notes: notes ?? null,
      },
    );

    return this.serializeTask(startedTask);
  }

  async complete(
    currentUser: CurrentUserPayload,
    permissionKeys: string[],
    taskId: number,
    completeHousekeepingTaskDto: CompleteHousekeepingTaskDto,
  ) {
    const task = await this.findRequiredTask(taskId);

    this.ensureAssignedOnlyTaskAccess({
      currentUser,
      permissionKeys,
      task,
      fullPermission: 'housekeeping.tasks.complete',
      assignedPermission: 'housekeeping.tasks.complete.assigned',
    });
    this.ensureTaskCanComplete(task);

    const completionNotes = this.normalizeOptionalString(
      completeHousekeepingTaskDto.completionNotes,
    );
    const completedAt = new Date();
    const completedTask =
      await this.housekeepingTasksRepository.runInTransaction(
        async (client) => {
          await this.housekeepingTasksRepository.updateTask(
            task.id,
            {
              status: HousekeepingTaskStatus.INSPECTION_PENDING,
              completedAt,
              completedByUserId: currentUser.sub,
              completionNotes,
            },
            client,
          );

          if (task.room.cleaningStatus !== RoomCleaningStatus.CLEAN) {
            await this.roomsRepository.updateRoom(
              task.roomId,
              {
                cleaningStatus: RoomCleaningStatus.CLEAN,
              },
              client,
            );
            await this.roomsRepository.createStatusLogs(
              [
                {
                  roomId: task.roomId,
                  actorUserId: currentUser.sub,
                  field: 'cleaningStatus',
                  oldValue: task.room.cleaningStatus,
                  newValue: RoomCleaningStatus.CLEAN,
                  reason: 'Housekeeping task completed',
                },
              ],
              client,
            );
          }

          return this.findRequiredTask(task.id, client);
        },
      );

    await this.recordTaskAudit(
      currentUser,
      'housekeeping.tasks.completed',
      completedTask,
      {
        taskNumber: completedTask.taskNumber,
        roomId: completedTask.roomId,
        previousStatus: task.status,
        status: completedTask.status,
        previousCleaningStatus: task.room.cleaningStatus,
        cleaningStatus: completedTask.room.cleaningStatus,
        completionNotes,
      },
    );

    return this.serializeTask(completedTask);
  }

  async inspect(
    currentUser: CurrentUserPayload,
    taskId: number,
    inspectHousekeepingTaskDto: InspectHousekeepingTaskDto,
  ) {
    const task = await this.findRequiredTask(taskId);

    this.ensureTaskAwaitingInspection(task, 'inspected');

    const inspectionNotes =
      inspectHousekeepingTaskDto.inspectionNotes === undefined
        ? undefined
        : this.normalizeOptionalString(
            inspectHousekeepingTaskDto.inspectionNotes,
          );
    const inspectedTask = await this.housekeepingTasksRepository.updateTask(
      task.id,
      {
        inspectedAt: new Date(),
        inspectedByUserId: currentUser.sub,
        ...(inspectionNotes === undefined ? {} : { inspectionNotes }),
      },
    );

    await this.recordTaskAudit(
      currentUser,
      'housekeeping.tasks.inspected',
      inspectedTask,
      {
        taskNumber: inspectedTask.taskNumber,
        roomId: inspectedTask.roomId,
        status: inspectedTask.status,
        inspectionNotes: inspectedTask.inspectionNotes,
      },
    );

    return this.serializeTask(inspectedTask);
  }

  async approve(
    currentUser: CurrentUserPayload,
    taskId: number,
    approveHousekeepingTaskDto: ApproveHousekeepingTaskDto,
  ) {
    const task = await this.findRequiredTask(taskId);

    this.ensureTaskAwaitingInspection(task, 'approved');

    const inspectionNotes =
      approveHousekeepingTaskDto.inspectionNotes === undefined
        ? undefined
        : this.normalizeOptionalString(
            approveHousekeepingTaskDto.inspectionNotes,
          );
    const approvedAt = new Date();
    const approvedTask =
      await this.housekeepingTasksRepository.runInTransaction(
        async (client) => {
          await this.housekeepingTasksRepository.updateTask(
            task.id,
            {
              status: HousekeepingTaskStatus.APPROVED,
              inspectedAt: task.inspectedAt ?? approvedAt,
              inspectedByUserId: task.inspectedByUserId ?? currentUser.sub,
              approvedAt,
              approvedByUserId: currentUser.sub,
              ...(inspectionNotes === undefined ? {} : { inspectionNotes }),
            },
            client,
          );

          if (task.room.cleaningStatus !== RoomCleaningStatus.INSPECTED) {
            await this.roomsRepository.updateRoom(
              task.roomId,
              {
                cleaningStatus: RoomCleaningStatus.INSPECTED,
              },
              client,
            );
            await this.roomsRepository.createStatusLogs(
              [
                {
                  roomId: task.roomId,
                  actorUserId: currentUser.sub,
                  field: 'cleaningStatus',
                  oldValue: task.room.cleaningStatus,
                  newValue: RoomCleaningStatus.INSPECTED,
                  reason: 'Housekeeping task approved',
                },
              ],
              client,
            );
          }

          return this.findRequiredTask(task.id, client);
        },
      );

    await this.recordTaskAudit(
      currentUser,
      'housekeeping.tasks.approved',
      approvedTask,
      {
        taskNumber: approvedTask.taskNumber,
        roomId: approvedTask.roomId,
        previousStatus: task.status,
        status: approvedTask.status,
        previousCleaningStatus: task.room.cleaningStatus,
        cleaningStatus: approvedTask.room.cleaningStatus,
        inspectionNotes: approvedTask.inspectionNotes,
      },
    );

    return this.serializeTask(approvedTask);
  }

  async reject(
    currentUser: CurrentUserPayload,
    taskId: number,
    rejectHousekeepingTaskDto: RejectHousekeepingTaskDto,
  ) {
    const task = await this.findRequiredTask(taskId);

    this.ensureTaskAwaitingInspection(task, 'rejected');

    const reason = this.normalizeRequiredString(
      rejectHousekeepingTaskDto.reason,
      'Task rejection reason is required.',
    );
    const inspectionNotes =
      rejectHousekeepingTaskDto.inspectionNotes === undefined
        ? undefined
        : this.normalizeOptionalString(
            rejectHousekeepingTaskDto.inspectionNotes,
          );
    const rejectedAt = new Date();
    const rejectedTask = await this.housekeepingTasksRepository.updateTask(
      task.id,
      {
        status: HousekeepingTaskStatus.REJECTED,
        inspectedAt: task.inspectedAt ?? rejectedAt,
        inspectedByUserId: task.inspectedByUserId ?? currentUser.sub,
        rejectedAt,
        rejectedByUserId: currentUser.sub,
        rejectionReason: reason,
        ...(inspectionNotes === undefined ? {} : { inspectionNotes }),
      },
    );

    await this.recordTaskAudit(
      currentUser,
      'housekeeping.tasks.rejected',
      rejectedTask,
      {
        taskNumber: rejectedTask.taskNumber,
        roomId: rejectedTask.roomId,
        previousStatus: task.status,
        status: rejectedTask.status,
        rejectionReason: reason,
        inspectionNotes: rejectedTask.inspectionNotes,
      },
    );

    return this.serializeTask(rejectedTask);
  }

  private async assignTask({
    currentUser,
    task,
    assignedToUserId,
    notes,
    auditAction,
    previousAssignedToUserId,
  }: {
    currentUser: CurrentUserPayload;
    task: HousekeepingTaskRecord;
    assignedToUserId: number;
    notes?: string | null;
    auditAction: string;
    previousAssignedToUserId: number | null;
  }) {
    this.ensureTaskCanBeAssigned(task);
    const assignedUser = await this.ensureActiveUser(assignedToUserId);
    const nextStatus =
      task.status === HousekeepingTaskStatus.IN_PROGRESS
        ? HousekeepingTaskStatus.IN_PROGRESS
        : HousekeepingTaskStatus.ASSIGNED;
    const updatedTask = await this.housekeepingTasksRepository.updateTask(
      task.id,
      {
        assignedToUserId: assignedUser.id,
        assignedByUserId: currentUser.sub,
        status: nextStatus,
        ...(notes === undefined
          ? {}
          : { notes: this.normalizeOptionalString(notes) }),
      },
    );

    await this.recordTaskAudit(currentUser, auditAction, updatedTask, {
      taskNumber: updatedTask.taskNumber,
      roomId: updatedTask.roomId,
      previousAssignedToUserId,
      assignedToUserId: updatedTask.assignedToUserId,
      previousStatus: task.status,
      status: updatedTask.status,
      notes: notes === undefined ? null : this.normalizeOptionalString(notes),
    });

    return this.serializeTask(updatedTask);
  }

  private ensureAssignedOnlyTaskAccess({
    currentUser,
    permissionKeys,
    task,
    fullPermission,
    assignedPermission,
  }: {
    currentUser: CurrentUserPayload;
    permissionKeys: string[];
    task: HousekeepingTaskRecord;
    fullPermission: string;
    assignedPermission: string;
  }) {
    if (permissionKeys.includes(fullPermission)) {
      return;
    }

    if (
      permissionKeys.includes(assignedPermission) &&
      task.assignedToUserId === currentUser.sub
    ) {
      return;
    }

    throw new ForbiddenException('Task is not assigned to the current user.');
  }

  private async ensureRoomCleaningStatusAccess({
    currentUser,
    permissionKeys,
    roomId,
  }: {
    currentUser: CurrentUserPayload;
    permissionKeys: string[];
    roomId: number;
  }) {
    if (permissionKeys.includes('room_cleaning_status.update')) {
      return;
    }

    if (permissionKeys.includes('room_cleaning_status.update.assigned')) {
      const assignedTask =
        await this.housekeepingTasksRepository.findActiveAssignedTaskForRoom({
          roomId,
          assignedToUserId: currentUser.sub,
        });

      if (assignedTask) {
        return;
      }
    }

    throw new ForbiddenException(
      'Room cleaning status can only be updated for assigned rooms.',
    );
  }

  private ensureTaskCanStart(task: HousekeepingTaskRecord) {
    if (
      task.status !== HousekeepingTaskStatus.PENDING &&
      task.status !== HousekeepingTaskStatus.ASSIGNED &&
      task.status !== HousekeepingTaskStatus.REJECTED
    ) {
      throw new ConflictException(
        'Task cannot be started in its current status.',
      );
    }
  }

  private ensureTaskCanComplete(task: HousekeepingTaskRecord) {
    if (
      task.status !== HousekeepingTaskStatus.IN_PROGRESS &&
      task.status !== HousekeepingTaskStatus.ASSIGNED
    ) {
      throw new ConflictException(
        'Task cannot be completed in its current status.',
      );
    }
  }

  private async findRequiredTask(
    taskId: number,
    client?: Prisma.TransactionClient,
  ) {
    const task = await this.housekeepingTasksRepository.findTask(
      taskId,
      client,
    );

    if (!task) {
      throw new NotFoundException('Housekeeping task was not found.');
    }

    return task;
  }

  private async ensureActiveRoom(roomId: number) {
    const room = await this.roomsRepository.findRoom(roomId);

    if (!room) {
      throw new NotFoundException('Room was not found.');
    }

    if (!room.isActive) {
      throw new BadRequestException(
        'Cannot create or update a task for an inactive room.',
      );
    }

    return room;
  }

  private async ensureActiveUser(userId: number) {
    const user = await this.housekeepingTasksRepository.findActiveUser(userId);

    if (!user) {
      throw new NotFoundException('Assigned user was not found or inactive.');
    }

    return user;
  }

  private ensureTaskCanBeAssigned(task: HousekeepingTaskRecord) {
    if (
      task.status === HousekeepingTaskStatus.APPROVED ||
      task.status === HousekeepingTaskStatus.CANCELLED ||
      task.status === HousekeepingTaskStatus.INSPECTION_PENDING ||
      task.status === HousekeepingTaskStatus.COMPLETED
    ) {
      throw new ConflictException(
        'Task cannot be assigned in its current status.',
      );
    }
  }

  private async generateTaskNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (let attempt = 0; attempt < 5; attempt++) {
      const sequence = `${Date.now().toString().slice(-6)}${attempt}`.slice(-6);
      const taskNumber = `HKT-${datePart}-${sequence}`;
      const existingTask =
        await this.housekeepingTasksRepository.findByTaskNumber(taskNumber);

      if (!existingTask) {
        return taskNumber;
      }
    }

    throw new ConflictException('Could not generate a unique task number.');
  }

  private serializeTask(task: HousekeepingTaskRecord) {
    return {
      id: task.id,
      taskNumber: task.taskNumber,
      roomId: task.roomId,
      type: task.type,
      status: task.status,
      priority: task.priority,
      assignedToUserId: task.assignedToUserId,
      assignedByUserId: task.assignedByUserId,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      inspectedAt: task.inspectedAt,
      approvedAt: task.approvedAt,
      rejectedAt: task.rejectedAt,
      cancelledAt: task.cancelledAt,
      completedByUserId: task.completedByUserId,
      inspectedByUserId: task.inspectedByUserId,
      approvedByUserId: task.approvedByUserId,
      rejectedByUserId: task.rejectedByUserId,
      cancelledByUserId: task.cancelledByUserId,
      notes: task.notes,
      completionNotes: task.completionNotes,
      inspectionNotes: task.inspectionNotes,
      rejectionReason: task.rejectionReason,
      cancellationReason: task.cancellationReason,
      sourceType: task.sourceType,
      sourceId: task.sourceId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      room: task.room,
      assignedTo: this.serializeUserSummary(task.assignedTo),
      assignedBy: this.serializeUserSummary(task.assignedBy),
      completedBy: this.serializeUserSummary(task.completedBy),
      inspectedBy: this.serializeUserSummary(task.inspectedBy),
      approvedBy: this.serializeUserSummary(task.approvedBy),
      rejectedBy: this.serializeUserSummary(task.rejectedBy),
      cancelledBy: this.serializeUserSummary(task.cancelledBy),
    };
  }

  private serializeUserSummary(
    user:
      | HousekeepingTaskRecord['assignedTo']
      | ActiveHousekeepingUserRecord
      | null,
  ) {
    return user
      ? {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          status: user.status,
        }
      : null;
  }

  private taskAuditSnapshot(task: HousekeepingTaskRecord) {
    return {
      roomId: task.roomId,
      type: task.type,
      priority: task.priority,
      notes: task.notes,
      sourceType: task.sourceType,
      sourceId: task.sourceId,
    };
  }

  private serializeTaskUpdateData(
    data: Prisma.HousekeepingTaskUncheckedUpdateInput,
  ) {
    return {
      roomId: this.serializeUpdateValue(data.roomId),
      type: this.serializeUpdateValue(data.type),
      priority: this.serializeUpdateValue(data.priority),
      notes: this.serializeUpdateValue(data.notes),
      sourceType: this.serializeUpdateValue(data.sourceType),
      sourceId: this.serializeUpdateValue(data.sourceId),
    };
  }

  private serializeUpdateValue(value: unknown) {
    return value === undefined ? null : (value as Prisma.InputJsonValue);
  }

  private recordTaskAudit(
    currentUser: CurrentUserPayload,
    action: string,
    task: HousekeepingTaskRecord,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'HousekeepingTask',
      entityId: String(task.id),
      metadata,
    });
  }

  private parseDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid housekeeping task date.');
    }

    return date;
  }

  private parseOptionalDate(value?: string) {
    return value === undefined ? undefined : this.parseDate(value);
  }

  private normalizeRequiredString(value: string, message: string) {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(message);
    }

    return normalized;
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = value?.trim();

    return normalized || null;
  }
}
