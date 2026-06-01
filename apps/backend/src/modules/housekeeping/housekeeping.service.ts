import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  HousekeepingPriority,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  Prisma,
  RoomCleaningStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { RoomsRepository } from '../rooms/repositories/rooms.repository';
import { AssignHousekeepingTaskDto } from './dto/assign-housekeeping-task.dto';
import { CancelHousekeepingTaskDto } from './dto/cancel-housekeeping-task.dto';
import { CompleteHousekeepingTaskDto } from './dto/complete-housekeeping-task.dto';
import { CreateHousekeepingTaskDto } from './dto/create-housekeeping-task.dto';
import { GetHousekeepingTasksQueryDto } from './dto/get-housekeeping-tasks-query.dto';
import { ReassignHousekeepingTaskDto } from './dto/reassign-housekeeping-task.dto';
import { StartHousekeepingTaskDto } from './dto/start-housekeeping-task.dto';
import { UpdateHousekeepingTaskDto } from './dto/update-housekeeping-task.dto';
import {
  ActiveHousekeepingUserRecord,
  HousekeepingTaskRecord,
  HousekeepingTasksRepository,
} from './repositories/housekeeping-tasks.repository';

@Injectable()
export class HousekeepingService {
  constructor(
    private readonly housekeepingTasksRepository: HousekeepingTasksRepository,
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

  async getById(_currentUser: CurrentUserPayload, taskId: number) {
    const task = await this.findRequiredTask(taskId);

    return this.serializeTask(task);
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
