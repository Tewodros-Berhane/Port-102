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
      listTasks: jest.fn(),
      updateTask: jest.fn(),
      findActiveUser: jest.fn(),
    };
    roomsRepository = {
      findRoom: jest.fn().mockResolvedValue(createRoom()),
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
});
