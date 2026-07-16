import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  HousekeepingIssueStatus,
  HousekeepingPriority,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
  UserStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RoomsRepository } from '../rooms/repositories/rooms.repository';
import { HousekeepingService } from './housekeeping.service';
import { HousekeepingIssuesRepository } from './repositories/housekeeping-issues.repository';
import { HousekeepingTasksRepository } from './repositories/housekeeping-tasks.repository';

const currentUser = {
  sub: 1,
  email: 'supervisor@demo-hotel.com',
  roleKey: 'HOUSEKEEPING_SUPERVISOR',
  roleId: 6,
  departmentId: 3,
  tokenVersion: 0,
};

const now = new Date('2026-06-02T10:00:00.000Z');

function createRoom(overrides: Record<string, unknown> = {}) {
  return {
    id: 12,
    roomNumber: '101',
    displayName: 'Deluxe 101',
    floorId: 1,
    roomTypeId: 2,
    occupancyStatus: RoomOccupancyStatus.VACANT,
    cleaningStatus: RoomCleaningStatus.DIRTY,
    maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
    notes: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    floor: {
      id: 1,
      number: 1,
      name: 'First Floor',
      isActive: true,
    },
    roomType: {
      id: 2,
      name: 'Deluxe',
      code: 'DLX',
      baseOccupancy: 1,
      maxOccupancy: 2,
      baseRate: null,
      isActive: true,
    },
    ...overrides,
  };
}

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    email: 'attendant@demo-hotel.com',
    fullName: 'Housekeeping Attendant',
    status: UserStatus.ACTIVE,
    role: {
      id: 6,
      key: 'HOUSEKEEPING_ATTENDANT',
      systemKey: 'HOUSEKEEPING_ATTENDANT',
      name: 'Housekeeping Attendant',
      isActive: true,
    },
    ...overrides,
  };
}

function createTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 9,
    taskNumber: 'HKT-20260602-123450',
    roomId: 12,
    type: HousekeepingTaskType.CHECKOUT_CLEANING,
    status: HousekeepingTaskStatus.PENDING,
    priority: HousekeepingPriority.NORMAL,
    assignedToUserId: null,
    assignedByUserId: null,
    startedAt: null,
    completedAt: null,
    inspectedAt: null,
    approvedAt: null,
    rejectedAt: null,
    cancelledAt: null,
    completedByUserId: null,
    inspectedByUserId: null,
    approvedByUserId: null,
    rejectedByUserId: null,
    cancelledByUserId: null,
    notes: null,
    completionNotes: null,
    inspectionNotes: null,
    rejectionReason: null,
    cancellationReason: null,
    sourceType: null,
    sourceId: null,
    createdAt: now,
    updatedAt: now,
    room: createRoom(),
    assignedTo: null,
    assignedBy: null,
    completedBy: null,
    inspectedBy: null,
    approvedBy: null,
    rejectedBy: null,
    cancelledBy: null,
    ...overrides,
  };
}

function createIssue(overrides: Record<string, unknown> = {}) {
  return {
    id: 15,
    issueNumber: 'HKI-20260602-123450',
    taskId: null,
    roomId: 12,
    reportedByUserId: currentUser.sub,
    status: HousekeepingIssueStatus.OPEN,
    title: 'Broken lamp',
    description: 'Lamp does not turn on.',
    photoUrl: null,
    resolvedAt: null,
    resolvedByUserId: null,
    resolutionNotes: null,
    createdAt: now,
    updatedAt: now,
    room: {
      id: 12,
      roomNumber: '101',
      displayName: 'Deluxe 101',
      floorId: 1,
      roomTypeId: 2,
      occupancyStatus: RoomOccupancyStatus.VACANT,
      cleaningStatus: RoomCleaningStatus.DIRTY,
      maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      isActive: true,
    },
    task: null,
    reportedBy: {
      id: currentUser.sub,
      email: currentUser.email,
      fullName: 'Supervisor User',
      status: UserStatus.ACTIVE,
    },
    resolvedBy: null,
    ...overrides,
  };
}

describe('HousekeepingService', () => {
  let service: HousekeepingService;
  let housekeepingTasksRepository: {
    runInTransaction: jest.Mock;
    createTask: jest.Mock;
    findTask: jest.Mock;
    findByTaskNumber: jest.Mock;
    findOpenCheckoutCleaningTask: jest.Mock;
    findActiveAssignedTaskForRoom: jest.Mock;
    listTasks: jest.Mock;
    countTasks: jest.Mock;
    listTasksForProductivity: jest.Mock;
    updateTask: jest.Mock;
    findActiveUser: jest.Mock;
    listAssignableAttendants: jest.Mock;
  };
  let housekeepingIssuesRepository: {
    createIssue: jest.Mock;
    findIssue: jest.Mock;
    findByIssueNumber: jest.Mock;
    listIssues: jest.Mock;
    countIssues: jest.Mock;
    updateIssue: jest.Mock;
  };
  let roomsRepository: {
    findRoom: jest.Mock;
    countRooms: jest.Mock;
    updateRoom: jest.Mock;
    createStatusLogs: jest.Mock;
  };
  let auditLogsService: {
    record: jest.Mock;
  };

  beforeEach(async () => {
    housekeepingTasksRepository = {
      runInTransaction: jest.fn(async (operation) => operation({})),
      createTask: jest.fn(),
      findTask: jest.fn(),
      findByTaskNumber: jest.fn().mockResolvedValue(null),
      findOpenCheckoutCleaningTask: jest.fn().mockResolvedValue(null),
      findActiveAssignedTaskForRoom: jest.fn(),
      listTasks: jest.fn(),
      countTasks: jest.fn(),
      listTasksForProductivity: jest.fn(),
      updateTask: jest.fn(),
      findActiveUser: jest.fn(),
      listAssignableAttendants: jest.fn(),
    };
    housekeepingIssuesRepository = {
      createIssue: jest.fn(),
      findIssue: jest.fn(),
      findByIssueNumber: jest.fn().mockResolvedValue(null),
      listIssues: jest.fn(),
      countIssues: jest.fn(),
      updateIssue: jest.fn(),
    };
    roomsRepository = {
      findRoom: jest.fn().mockResolvedValue(createRoom()),
      countRooms: jest.fn(),
      updateRoom: jest.fn(),
      createStatusLogs: jest.fn(),
    };
    auditLogsService = {
      record: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HousekeepingService,
        {
          provide: HousekeepingTasksRepository,
          useValue: housekeepingTasksRepository,
        },
        {
          provide: HousekeepingIssuesRepository,
          useValue: housekeepingIssuesRepository,
        },
        {
          provide: RoomsRepository,
          useValue: roomsRepository,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<HousekeepingService>(HousekeepingService);
  });

  it('returns paginated safe assignable attendant projections', async () => {
    housekeepingTasksRepository.listAssignableAttendants.mockResolvedValue([
      1,
      [
        {
          ...createUser(),
          employees: [{ id: 22, employeeNumber: 'HK-ATT-001' }],
        },
      ],
    ]);
    await expect(
      service.listAssignees({ page: 1, limit: 20, search: 'att' }),
    ).resolves.toEqual({
      data: [
        {
          id: 7,
          fullName: 'Housekeeping Attendant',
          email: 'attendant@demo-hotel.com',
          employeeId: 22,
          employeeNumber: 'HK-ATT-001',
        },
      ],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    expect(
      housekeepingTasksRepository.listAssignableAttendants,
    ).toHaveBeenCalledWith({ skip: 0, take: 20, search: 'att' });
  });

  it('creates a pending task for an active room', async () => {
    const task = createTask();
    housekeepingTasksRepository.createTask.mockResolvedValue(task);

    const result = await service.create(currentUser, {
      roomId: 12,
      notes: '  Clean after checkout.  ',
    });

    expect(roomsRepository.findRoom).toHaveBeenCalledWith(12);
    expect(housekeepingTasksRepository.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskNumber: expect.stringMatching(/^HKT-\d{8}-\d{6}$/),
        roomId: 12,
        type: HousekeepingTaskType.CHECKOUT_CLEANING,
        status: HousekeepingTaskStatus.PENDING,
        priority: HousekeepingPriority.NORMAL,
        notes: 'Clean after checkout.',
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'housekeeping.tasks.created',
        entityType: 'HousekeepingTask',
        entityId: '9',
      }),
    );
    expect(result).toMatchObject({
      id: 9,
      taskNumber: task.taskNumber,
      roomId: 12,
      status: HousekeepingTaskStatus.PENDING,
    });
  });

  it('creates a checkout cleaning task from stay checkout', async () => {
    const task = createTask({
      sourceType: 'STAY_CHECKOUT',
      sourceId: 40,
    });
    const client = {};
    housekeepingTasksRepository.createTask.mockResolvedValue(task);

    const result = await service.createCheckoutCleaningTaskFromStay({
      stayId: 40,
      roomId: 12,
      client,
    });

    expect(
      housekeepingTasksRepository.findOpenCheckoutCleaningTask,
    ).toHaveBeenCalledWith(
      {
        roomId: 12,
        sourceId: 40,
      },
      client,
    );
    expect(housekeepingTasksRepository.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskNumber: expect.stringMatching(/^HKT-\d{8}-\d{6}$/),
        roomId: 12,
        type: HousekeepingTaskType.CHECKOUT_CLEANING,
        status: HousekeepingTaskStatus.PENDING,
        priority: HousekeepingPriority.NORMAL,
        sourceType: 'STAY_CHECKOUT',
        sourceId: 40,
      }),
      client,
    );
    expect(result).toEqual({
      task,
      created: true,
    });
  });

  it('reuses an open checkout cleaning task instead of duplicating it', async () => {
    const existingTask = createTask({
      sourceType: 'STAY_CHECKOUT',
      sourceId: 40,
    });
    housekeepingTasksRepository.findOpenCheckoutCleaningTask.mockResolvedValue(
      existingTask,
    );

    const result = await service.createCheckoutCleaningTaskFromStay({
      stayId: 40,
      roomId: 12,
    });

    expect(housekeepingTasksRepository.createTask).not.toHaveBeenCalled();
    expect(result).toEqual({
      task: existingTask,
      created: false,
    });
  });

  it('creates an assigned task when an active assignee is provided', async () => {
    const assignedUser = createUser();
    const task = createTask({
      status: HousekeepingTaskStatus.ASSIGNED,
      assignedToUserId: assignedUser.id,
      assignedByUserId: currentUser.sub,
      assignedTo: {
        id: assignedUser.id,
        email: assignedUser.email,
        fullName: assignedUser.fullName,
        status: assignedUser.status,
      },
    });
    housekeepingTasksRepository.findActiveUser.mockResolvedValue(assignedUser);
    housekeepingTasksRepository.createTask.mockResolvedValue(task);

    await service.create(currentUser, {
      roomId: 12,
      assignedToUserId: assignedUser.id,
    });

    expect(housekeepingTasksRepository.findActiveUser).toHaveBeenCalledWith(
      assignedUser.id,
    );
    expect(housekeepingTasksRepository.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        assignedToUserId: assignedUser.id,
        assignedByUserId: currentUser.sub,
        status: HousekeepingTaskStatus.ASSIGNED,
      }),
    );
  });

  it('rejects task creation for inactive rooms', async () => {
    roomsRepository.findRoom.mockResolvedValue(createRoom({ isActive: false }));

    await expect(
      service.create(currentUser, {
        roomId: 12,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('lists tasks with pagination and filters', async () => {
    const task = createTask();
    housekeepingTasksRepository.listTasks.mockResolvedValue([1, [task]]);

    const result = await service.list(currentUser, {
      page: 2,
      limit: 5,
      status: HousekeepingTaskStatus.PENDING,
      createdFrom: '2026-06-01',
      createdTo: '2026-06-02',
    });

    expect(housekeepingTasksRepository.listTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        status: HousekeepingTaskStatus.PENDING,
        createdFrom: expect.any(Date),
        createdTo: expect.any(Date),
      }),
    );
    expect(result.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 1,
      totalPages: 1,
    });
  });

  it('lists only tasks assigned to the current user', async () => {
    housekeepingTasksRepository.listTasks.mockResolvedValue([0, []]);

    await service.listAssignedToMe(currentUser, {
      page: 1,
      limit: 20,
      assignedToUserId: 999,
    });

    expect(housekeepingTasksRepository.listTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        assignedToUserId: currentUser.sub,
      }),
    );
  });

  it('updates room cleaning status, creates a status log, and audits the change', async () => {
    const updatedRoom = createRoom({
      cleaningStatus: RoomCleaningStatus.INSPECTED,
    });
    roomsRepository.updateRoom.mockResolvedValue(updatedRoom);

    const result = await service.updateRoomCleaningStatus(
      currentUser,
      ['room_cleaning_status.update'],
      12,
      {
        cleaningStatus: RoomCleaningStatus.INSPECTED,
        reason: ' Supervisor inspected room. ',
      },
    );

    expect(roomsRepository.findRoom).toHaveBeenCalledWith(12);
    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(12, {
      cleaningStatus: RoomCleaningStatus.INSPECTED,
    });
    expect(roomsRepository.createStatusLogs).toHaveBeenCalledWith([
      {
        roomId: 12,
        actorUserId: currentUser.sub,
        field: 'cleaningStatus',
        oldValue: RoomCleaningStatus.DIRTY,
        newValue: RoomCleaningStatus.INSPECTED,
        reason: 'Supervisor inspected room.',
      },
    ]);
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'room_cleaning_status.updated',
        entityType: 'Room',
        entityId: '12',
        metadata: expect.objectContaining({
          previousCleaningStatus: RoomCleaningStatus.DIRTY,
          cleaningStatus: RoomCleaningStatus.INSPECTED,
          reason: 'Supervisor inspected room.',
        }),
      }),
    );
    expect(result).toMatchObject({
      id: 12,
      cleaningStatus: RoomCleaningStatus.INSPECTED,
    });
  });

  it('rejects assigned-only room cleaning updates without an active assigned task', async () => {
    housekeepingTasksRepository.findActiveAssignedTaskForRoom.mockResolvedValue(
      null,
    );

    await expect(
      service.updateRoomCleaningStatus(
        currentUser,
        ['room_cleaning_status.update.assigned'],
        12,
        {
          cleaningStatus: RoomCleaningStatus.CLEAN,
        },
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(
      housekeepingTasksRepository.findActiveAssignedTaskForRoom,
    ).toHaveBeenCalledWith({
      roomId: 12,
      assignedToUserId: currentUser.sub,
    });
    expect(roomsRepository.updateRoom).not.toHaveBeenCalled();
  });

  it('reports a housekeeping issue for an active room and linked task', async () => {
    const task = createTask({
      roomId: 12,
    });
    const issue = createIssue({
      taskId: task.id,
      task: {
        id: task.id,
        taskNumber: task.taskNumber,
        roomId: task.roomId,
        type: task.type,
        status: task.status,
        priority: task.priority,
      },
      title: 'Broken lamp',
      description: 'Lamp does not turn on.',
      photoUrl: 'https://cdn.example.com/lamp.jpg',
    });
    housekeepingTasksRepository.findTask.mockResolvedValue(task);
    housekeepingIssuesRepository.createIssue.mockResolvedValue(issue);

    const result = await service.reportIssue(currentUser, {
      roomId: 12,
      taskId: task.id,
      title: ' Broken lamp ',
      description: ' Lamp does not turn on. ',
      photoUrl: ' https://cdn.example.com/lamp.jpg ',
    });

    expect(roomsRepository.findRoom).toHaveBeenCalledWith(12);
    expect(housekeepingTasksRepository.findTask).toHaveBeenCalledWith(
      task.id,
      undefined,
    );
    expect(housekeepingIssuesRepository.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        issueNumber: expect.stringMatching(/^HKI-\d{8}-\d{6}$/),
        roomId: 12,
        taskId: task.id,
        reportedByUserId: currentUser.sub,
        status: HousekeepingIssueStatus.OPEN,
        title: 'Broken lamp',
        description: 'Lamp does not turn on.',
        photoUrl: 'https://cdn.example.com/lamp.jpg',
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'housekeeping.issues.reported',
        entityType: 'HousekeepingIssue',
        entityId: '15',
      }),
    );
    expect(result).toMatchObject({
      id: 15,
      status: HousekeepingIssueStatus.OPEN,
      title: 'Broken lamp',
      taskId: task.id,
    });
  });

  it('rejects issue reporting when the linked task belongs to another room', async () => {
    housekeepingTasksRepository.findTask.mockResolvedValue(
      createTask({
        roomId: 99,
      }),
    );

    await expect(
      service.reportIssue(currentUser, {
        roomId: 12,
        taskId: 9,
        title: 'Broken lamp',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(housekeepingIssuesRepository.createIssue).not.toHaveBeenCalled();
  });

  it('lists housekeeping issues with pagination and filters', async () => {
    const issue = createIssue();
    housekeepingIssuesRepository.listIssues.mockResolvedValue([1, [issue]]);

    const result = await service.listIssues(currentUser, {
      page: 2,
      limit: 5,
      status: HousekeepingIssueStatus.OPEN,
      roomId: 12,
      createdFrom: '2026-06-01',
      createdTo: '2026-06-02',
    });

    expect(housekeepingIssuesRepository.listIssues).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        status: HousekeepingIssueStatus.OPEN,
        roomId: 12,
        createdFrom: expect.any(Date),
        createdTo: expect.any(Date),
      }),
    );
    expect(result.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 1,
      totalPages: 1,
    });
  });

  it('resolves an open housekeeping issue', async () => {
    const issue = createIssue();
    const resolvedIssue = createIssue({
      status: HousekeepingIssueStatus.RESOLVED,
      resolvedAt: now,
      resolvedByUserId: currentUser.sub,
      resolutionNotes: 'Lamp was replaced.',
    });
    housekeepingIssuesRepository.findIssue.mockResolvedValue(issue);
    housekeepingIssuesRepository.updateIssue.mockResolvedValue(resolvedIssue);

    const result = await service.resolveIssue(currentUser, 15, {
      resolutionNotes: ' Lamp was replaced. ',
    });

    expect(housekeepingIssuesRepository.updateIssue).toHaveBeenCalledWith(15, {
      status: HousekeepingIssueStatus.RESOLVED,
      resolvedAt: expect.any(Date),
      resolvedByUserId: currentUser.sub,
      resolutionNotes: 'Lamp was replaced.',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'housekeeping.issues.resolved',
        entityType: 'HousekeepingIssue',
        entityId: '15',
      }),
    );
    expect(result).toMatchObject({
      status: HousekeepingIssueStatus.RESOLVED,
      resolvedByUserId: currentUser.sub,
      resolutionNotes: 'Lamp was replaced.',
    });
  });

  it('rejects resolving a closed housekeeping issue', async () => {
    housekeepingIssuesRepository.findIssue.mockResolvedValue(
      createIssue({
        status: HousekeepingIssueStatus.CANCELLED,
      }),
    );

    await expect(
      service.resolveIssue(currentUser, 15, {
        resolutionNotes: 'Fixed.',
      }),
    ).rejects.toThrow(ConflictException);
    expect(housekeepingIssuesRepository.updateIssue).not.toHaveBeenCalled();
  });

  it('cancels an open housekeeping issue with a required reason', async () => {
    const issue = createIssue();
    const cancelledIssue = createIssue({
      status: HousekeepingIssueStatus.CANCELLED,
    });
    housekeepingIssuesRepository.findIssue.mockResolvedValue(issue);
    housekeepingIssuesRepository.updateIssue.mockResolvedValue(cancelledIssue);

    const result = await service.cancelIssue(currentUser, 15, {
      reason: ' Duplicate issue. ',
    });

    expect(housekeepingIssuesRepository.updateIssue).toHaveBeenCalledWith(15, {
      status: HousekeepingIssueStatus.CANCELLED,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'housekeeping.issues.cancelled',
        entityType: 'HousekeepingIssue',
        entityId: '15',
        metadata: expect.objectContaining({
          reason: 'Duplicate issue.',
        }),
      }),
    );
    expect(result).toMatchObject({
      status: HousekeepingIssueStatus.CANCELLED,
    });
  });

  it('requires a reason before cancelling a housekeeping issue', async () => {
    housekeepingIssuesRepository.findIssue.mockResolvedValue(createIssue());

    await expect(
      service.cancelIssue(currentUser, 15, {
        reason: '  ',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(housekeepingIssuesRepository.updateIssue).not.toHaveBeenCalled();
  });

  it('assigns an unassigned task to an active user', async () => {
    const assignedUser = createUser();
    const task = createTask();
    const assignedTask = createTask({
      status: HousekeepingTaskStatus.ASSIGNED,
      assignedToUserId: assignedUser.id,
      assignedByUserId: currentUser.sub,
    });
    housekeepingTasksRepository.findTask.mockResolvedValue(task);
    housekeepingTasksRepository.findActiveUser.mockResolvedValue(assignedUser);
    housekeepingTasksRepository.updateTask.mockResolvedValue(assignedTask);

    const result = await service.assign(currentUser, 9, {
      assignedToUserId: assignedUser.id,
      notes: ' Start soon. ',
    });

    expect(housekeepingTasksRepository.updateTask).toHaveBeenCalledWith(9, {
      assignedToUserId: assignedUser.id,
      assignedByUserId: currentUser.sub,
      status: HousekeepingTaskStatus.ASSIGNED,
      notes: 'Start soon.',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'housekeeping.tasks.assigned',
      }),
    );
    expect(result).toMatchObject({
      status: HousekeepingTaskStatus.ASSIGNED,
      assignedToUserId: assignedUser.id,
    });
  });

  it('rejects reassignment for unassigned tasks', async () => {
    housekeepingTasksRepository.findTask.mockResolvedValue(createTask());

    await expect(
      service.reassign(currentUser, 9, {
        assignedToUserId: 8,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('starts an assigned task for an assigned-only attendant', async () => {
    const task = createTask({
      status: HousekeepingTaskStatus.ASSIGNED,
      assignedToUserId: currentUser.sub,
    });
    const startedTask = createTask({
      status: HousekeepingTaskStatus.IN_PROGRESS,
      assignedToUserId: currentUser.sub,
      startedAt: now,
      notes: 'Starting now.',
    });
    housekeepingTasksRepository.findTask.mockResolvedValue(task);
    housekeepingTasksRepository.updateTask.mockResolvedValue(startedTask);

    const result = await service.start(
      currentUser,
      ['housekeeping.tasks.start.assigned'],
      9,
      {
        notes: ' Starting now. ',
      },
    );

    expect(housekeepingTasksRepository.updateTask).toHaveBeenCalledWith(9, {
      status: HousekeepingTaskStatus.IN_PROGRESS,
      startedAt: expect.any(Date),
      notes: 'Starting now.',
    });
    expect(result).toMatchObject({
      status: HousekeepingTaskStatus.IN_PROGRESS,
      startedAt: now,
    });
  });

  it('rejects assigned-only start for a task assigned to another user', async () => {
    housekeepingTasksRepository.findTask.mockResolvedValue(
      createTask({
        status: HousekeepingTaskStatus.ASSIGNED,
        assignedToUserId: 999,
      }),
    );

    await expect(
      service.start(currentUser, ['housekeeping.tasks.start.assigned'], 9, {}),
    ).rejects.toThrow(ForbiddenException);
  });

  it('completes a task, marks room clean, and creates a room status log', async () => {
    const task = createTask({
      status: HousekeepingTaskStatus.IN_PROGRESS,
      assignedToUserId: currentUser.sub,
      room: createRoom({
        cleaningStatus: RoomCleaningStatus.DIRTY,
      }),
    });
    const completedTask = createTask({
      status: HousekeepingTaskStatus.INSPECTION_PENDING,
      assignedToUserId: currentUser.sub,
      completedAt: now,
      completedByUserId: currentUser.sub,
      completionNotes: 'Room cleaned.',
      room: createRoom({
        cleaningStatus: RoomCleaningStatus.CLEAN,
      }),
    });
    housekeepingTasksRepository.findTask
      .mockResolvedValueOnce(task)
      .mockResolvedValueOnce(completedTask);

    const result = await service.complete(
      currentUser,
      ['housekeeping.tasks.complete.assigned'],
      9,
      {
        completionNotes: ' Room cleaned. ',
      },
    );

    expect(housekeepingTasksRepository.updateTask).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        status: HousekeepingTaskStatus.INSPECTION_PENDING,
        completedByUserId: currentUser.sub,
        completionNotes: 'Room cleaned.',
      }),
      expect.any(Object),
    );
    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(
      12,
      {
        cleaningStatus: RoomCleaningStatus.CLEAN,
      },
      expect.any(Object),
    );
    expect(roomsRepository.createStatusLogs).toHaveBeenCalledWith(
      [
        {
          roomId: 12,
          actorUserId: currentUser.sub,
          field: 'cleaningStatus',
          oldValue: RoomCleaningStatus.DIRTY,
          newValue: RoomCleaningStatus.CLEAN,
          reason: 'Housekeeping task completed',
        },
      ],
      expect.any(Object),
    );
    expect(result).toMatchObject({
      status: HousekeepingTaskStatus.INSPECTION_PENDING,
      completedByUserId: currentUser.sub,
      room: {
        cleaningStatus: RoomCleaningStatus.CLEAN,
      },
    });
  });

  it('records inspection notes for a completed housekeeping task', async () => {
    const task = createTask({
      status: HousekeepingTaskStatus.INSPECTION_PENDING,
    });
    const inspectedTask = createTask({
      status: HousekeepingTaskStatus.INSPECTION_PENDING,
      inspectedAt: now,
      inspectedByUserId: currentUser.sub,
      inspectionNotes: 'Bathroom and minibar checked.',
    });
    housekeepingTasksRepository.findTask.mockResolvedValue(task);
    housekeepingTasksRepository.updateTask.mockResolvedValue(inspectedTask);

    const result = await service.inspect(currentUser, 9, {
      inspectionNotes: ' Bathroom and minibar checked. ',
    });

    expect(housekeepingTasksRepository.updateTask).toHaveBeenCalledWith(9, {
      inspectedAt: expect.any(Date),
      inspectedByUserId: currentUser.sub,
      inspectionNotes: 'Bathroom and minibar checked.',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'housekeeping.tasks.inspected',
      }),
    );
    expect(result).toMatchObject({
      status: HousekeepingTaskStatus.INSPECTION_PENDING,
      inspectedByUserId: currentUser.sub,
      inspectionNotes: 'Bathroom and minibar checked.',
    });
  });

  it('approves a task, marks room inspected, and creates a room status log', async () => {
    const task = createTask({
      status: HousekeepingTaskStatus.INSPECTION_PENDING,
      room: createRoom({
        cleaningStatus: RoomCleaningStatus.CLEAN,
      }),
    });
    const approvedTask = createTask({
      status: HousekeepingTaskStatus.APPROVED,
      inspectedAt: now,
      inspectedByUserId: currentUser.sub,
      approvedAt: now,
      approvedByUserId: currentUser.sub,
      inspectionNotes: 'Passed supervisor inspection.',
      room: createRoom({
        cleaningStatus: RoomCleaningStatus.INSPECTED,
      }),
    });
    housekeepingTasksRepository.findTask
      .mockResolvedValueOnce(task)
      .mockResolvedValueOnce(approvedTask);

    const result = await service.approve(currentUser, 9, {
      inspectionNotes: ' Passed supervisor inspection. ',
    });

    expect(housekeepingTasksRepository.updateTask).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        status: HousekeepingTaskStatus.APPROVED,
        inspectedByUserId: currentUser.sub,
        approvedByUserId: currentUser.sub,
        inspectionNotes: 'Passed supervisor inspection.',
      }),
      expect.any(Object),
    );
    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(
      12,
      {
        cleaningStatus: RoomCleaningStatus.INSPECTED,
      },
      expect.any(Object),
    );
    expect(roomsRepository.createStatusLogs).toHaveBeenCalledWith(
      [
        {
          roomId: 12,
          actorUserId: currentUser.sub,
          field: 'cleaningStatus',
          oldValue: RoomCleaningStatus.CLEAN,
          newValue: RoomCleaningStatus.INSPECTED,
          reason: 'Housekeeping task approved',
        },
      ],
      expect.any(Object),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'housekeeping.tasks.approved',
      }),
    );
    expect(result).toMatchObject({
      status: HousekeepingTaskStatus.APPROVED,
      approvedByUserId: currentUser.sub,
      room: {
        cleaningStatus: RoomCleaningStatus.INSPECTED,
      },
    });
  });

  it('rejects a task with a required reason', async () => {
    const task = createTask({
      status: HousekeepingTaskStatus.INSPECTION_PENDING,
    });
    const rejectedTask = createTask({
      status: HousekeepingTaskStatus.REJECTED,
      inspectedAt: now,
      inspectedByUserId: currentUser.sub,
      rejectedAt: now,
      rejectedByUserId: currentUser.sub,
      rejectionReason: 'Desk still dusty.',
      inspectionNotes: 'Reclean before reinspection.',
    });
    housekeepingTasksRepository.findTask.mockResolvedValue(task);
    housekeepingTasksRepository.updateTask.mockResolvedValue(rejectedTask);

    const result = await service.reject(currentUser, 9, {
      reason: ' Desk still dusty. ',
      inspectionNotes: ' Reclean before reinspection. ',
    });

    expect(housekeepingTasksRepository.updateTask).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        status: HousekeepingTaskStatus.REJECTED,
        inspectedByUserId: currentUser.sub,
        rejectedByUserId: currentUser.sub,
        rejectionReason: 'Desk still dusty.',
        inspectionNotes: 'Reclean before reinspection.',
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'housekeeping.tasks.rejected',
      }),
    );
    expect(result).toMatchObject({
      status: HousekeepingTaskStatus.REJECTED,
      rejectionReason: 'Desk still dusty.',
    });
  });

  it('requires a rejection reason before rejecting a task', async () => {
    housekeepingTasksRepository.findTask.mockResolvedValue(
      createTask({
        status: HousekeepingTaskStatus.INSPECTION_PENDING,
      }),
    );

    await expect(
      service.reject(currentUser, 9, {
        reason: '  ',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(housekeepingTasksRepository.updateTask).not.toHaveBeenCalled();
  });

  it('allows a rejected task to be restarted for rework', async () => {
    const task = createTask({
      status: HousekeepingTaskStatus.REJECTED,
      assignedToUserId: currentUser.sub,
      completedAt: now,
      completedByUserId: currentUser.sub,
      inspectedAt: now,
      inspectedByUserId: currentUser.sub,
      rejectedAt: now,
      rejectedByUserId: currentUser.sub,
      completionNotes: 'Room cleaned.',
      inspectionNotes: 'Needs correction.',
      rejectionReason: 'Desk still dusty.',
    });
    const startedTask = createTask({
      status: HousekeepingTaskStatus.IN_PROGRESS,
      assignedToUserId: currentUser.sub,
      startedAt: now,
    });
    housekeepingTasksRepository.findTask.mockResolvedValue(task);
    housekeepingTasksRepository.updateTask.mockResolvedValue(startedTask);

    await service.start(
      currentUser,
      ['housekeeping.tasks.start.assigned'],
      9,
      {},
    );

    expect(housekeepingTasksRepository.updateTask).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        status: HousekeepingTaskStatus.IN_PROGRESS,
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
      }),
    );
  });

  it('cancels a task with a required reason', async () => {
    const cancelledTask = createTask({
      status: HousekeepingTaskStatus.CANCELLED,
      cancelledByUserId: currentUser.sub,
      cancelledAt: now,
      cancellationReason: 'Guest extended stay.',
    });
    housekeepingTasksRepository.findTask.mockResolvedValue(createTask());
    housekeepingTasksRepository.updateTask.mockResolvedValue(cancelledTask);

    const result = await service.cancel(currentUser, 9, {
      reason: ' Guest extended stay. ',
    });

    expect(housekeepingTasksRepository.updateTask).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        status: HousekeepingTaskStatus.CANCELLED,
        cancelledByUserId: currentUser.sub,
        cancellationReason: 'Guest extended stay.',
      }),
    );
    expect(result).toMatchObject({
      status: HousekeepingTaskStatus.CANCELLED,
      cancellationReason: 'Guest extended stay.',
    });
  });

  it('returns not found for missing tasks', async () => {
    housekeepingTasksRepository.findTask.mockResolvedValue(null);

    await expect(service.getById(currentUser, 99)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns housekeeping dashboard counts', async () => {
    housekeepingTasksRepository.countTasks
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(8);
    housekeepingIssuesRepository.countIssues.mockResolvedValueOnce(9);
    roomsRepository.countRooms
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(11)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(13);

    const result = await service.getDashboard(currentUser, {
      date: '2026-06-03',
    });

    expect(housekeepingTasksRepository.countTasks).toHaveBeenCalledWith({
      status: HousekeepingTaskStatus.PENDING,
    });
    expect(housekeepingTasksRepository.countTasks).toHaveBeenCalledWith({
      status: HousekeepingTaskStatus.APPROVED,
      approvedAt: {
        gte: new Date('2026-06-03T00:00:00.000Z'),
        lte: new Date('2026-06-03T23:59:59.999Z'),
      },
    });
    expect(housekeepingTasksRepository.countTasks).toHaveBeenCalledWith({
      priority: HousekeepingPriority.URGENT,
      status: {
        in: [
          HousekeepingTaskStatus.PENDING,
          HousekeepingTaskStatus.ASSIGNED,
          HousekeepingTaskStatus.IN_PROGRESS,
          HousekeepingTaskStatus.INSPECTION_PENDING,
          HousekeepingTaskStatus.REJECTED,
        ],
      },
    });
    expect(housekeepingIssuesRepository.countIssues).toHaveBeenCalledWith({
      status: HousekeepingIssueStatus.OPEN,
    });
    expect(roomsRepository.countRooms).toHaveBeenCalledWith({
      cleaningStatus: RoomCleaningStatus.DIRTY,
    });
    expect(roomsRepository.countRooms).toHaveBeenCalledWith({
      maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
    });
    expect(result).toMatchObject({
      date: '2026-06-03',
      pendingTasks: 2,
      assignedTasks: 3,
      inProgressTasks: 4,
      inspectionPendingTasks: 5,
      approvedTasksToday: 6,
      rejectedTasksToday: 7,
      urgentTasks: 8,
      openIssues: 9,
      dirtyRooms: 10,
      cleanRooms: 11,
      inspectedRooms: 12,
      roomsOutOfOrder: 13,
    });
  });

  it('returns housekeeping productivity summaries for a date range', async () => {
    const attendant = {
      id: 7,
      email: 'attendant@demo-hotel.com',
      fullName: 'Housekeeping Attendant',
      status: UserStatus.ACTIVE,
    };
    housekeepingTasksRepository.listTasksForProductivity.mockResolvedValue([
      {
        id: 1,
        assignedToUserId: attendant.id,
        createdAt: new Date('2026-06-03T08:00:00.000Z'),
        startedAt: new Date('2026-06-03T08:15:00.000Z'),
        completedAt: new Date('2026-06-03T09:45:00.000Z'),
        approvedAt: new Date('2026-06-03T10:00:00.000Z'),
        rejectedAt: null,
        assignedTo: attendant,
      },
      {
        id: 2,
        assignedToUserId: attendant.id,
        createdAt: new Date('2026-06-03T11:00:00.000Z'),
        startedAt: new Date('2026-06-03T11:30:00.000Z'),
        completedAt: new Date('2026-06-03T12:00:00.000Z'),
        approvedAt: null,
        rejectedAt: new Date('2026-06-03T12:15:00.000Z'),
        assignedTo: attendant,
      },
    ]);

    const result = await service.getProductivity(currentUser, {
      from: '2026-06-03',
      to: '2026-06-03',
    });

    expect(
      housekeepingTasksRepository.listTasksForProductivity,
    ).toHaveBeenCalledWith({
      from: new Date('2026-06-03T00:00:00.000Z'),
      to: new Date('2026-06-03T23:59:59.999Z'),
    });
    expect(result.items).toEqual([
      {
        attendant,
        assignedCount: 2,
        completedCount: 2,
        approvedCount: 1,
        rejectedCount: 1,
        averageCompletionMinutes: 60,
      },
    ]);
  });

  it('rejects productivity requests with an inverted date range', async () => {
    await expect(
      service.getProductivity(currentUser, {
        from: '2026-06-04',
        to: '2026-06-03',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(
      housekeepingTasksRepository.listTasksForProductivity,
    ).not.toHaveBeenCalled();
  });
});
