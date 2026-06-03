import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import {
  HousekeepingIssueStatus,
  HousekeepingPriority,
  HousekeepingTaskType,
  RoomCleaningStatus,
} from '../../generated/prisma/client';
import {
  ANY_REQUIRED_PERMISSIONS_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HousekeepingController } from './housekeeping.controller';
import { HousekeepingService } from './housekeeping.service';

describe('HousekeepingController', () => {
  let controller: HousekeepingController;
  let housekeepingService: {
    create: jest.Mock;
    list: jest.Mock;
    listAssignedToMe: jest.Mock;
    getDashboard: jest.Mock;
    getProductivity: jest.Mock;
    reportIssue: jest.Mock;
    listIssues: jest.Mock;
    getIssueById: jest.Mock;
    resolveIssue: jest.Mock;
    cancelIssue: jest.Mock;
    getById: jest.Mock;
    updateRoomCleaningStatus: jest.Mock;
    update: jest.Mock;
    assign: jest.Mock;
    reassign: jest.Mock;
    start: jest.Mock;
    complete: jest.Mock;
    inspect: jest.Mock;
    approve: jest.Mock;
    reject: jest.Mock;
    cancel: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'supervisor@demo-hotel.com',
    roleKey: 'HOUSEKEEPING_SUPERVISOR',
    roleId: 6,
    departmentId: 3,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    housekeepingService = {
      create: jest.fn(),
      list: jest.fn(),
      listAssignedToMe: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      assign: jest.fn(),
      reassign: jest.fn(),
      start: jest.fn(),
      complete: jest.fn(),
      cancel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HousekeepingController],
      providers: [
        {
          provide: HousekeepingService,
          useValue: housekeepingService,
        },
        {
          provide: PrismaService,
          useValue: {
            role: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<HousekeepingController>(HousekeepingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('protects housekeeping routes with auth and permission guards', () => {
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, HousekeepingController) ?? [];

    expect(guards).toEqual([JwtAuthGuard, PermissionsGuard]);
  });

  it('declares required permissions for task routes', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        HousekeepingController.prototype.createTask,
      ),
    ).toEqual(['housekeeping.tasks.create']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        HousekeepingController.prototype.listTasks,
      ),
    ).toEqual(['housekeeping.tasks.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        HousekeepingController.prototype.assignTask,
      ),
    ).toEqual(['housekeeping.tasks.assign']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        HousekeepingController.prototype.reassignTask,
      ),
    ).toEqual(['housekeeping.tasks.reassign']);
    expect(
      Reflect.getMetadata(
        ANY_REQUIRED_PERMISSIONS_KEY,
        HousekeepingController.prototype.listMyAssignedTasks,
      ),
    ).toEqual(['housekeeping.tasks.read', 'housekeeping.tasks.read.assigned']);
    expect(
      Reflect.getMetadata(
        ANY_REQUIRED_PERMISSIONS_KEY,
        HousekeepingController.prototype.updateTask,
      ),
    ).toEqual([
      'housekeeping.tasks.create',
      'housekeeping.tasks.assign',
      'housekeeping.tasks.reassign',
    ]);
    expect(
      Reflect.getMetadata(
        ANY_REQUIRED_PERMISSIONS_KEY,
        HousekeepingController.prototype.startTask,
      ),
    ).toEqual([
      'housekeeping.tasks.start',
      'housekeeping.tasks.start.assigned',
    ]);
    expect(
      Reflect.getMetadata(
        ANY_REQUIRED_PERMISSIONS_KEY,
        HousekeepingController.prototype.completeTask,
      ),
    ).toEqual([
      'housekeeping.tasks.complete',
      'housekeeping.tasks.complete.assigned',
    ]);
  });

  it('delegates task creation and listing', () => {
    const createDto = {
      roomId: 12,
      type: HousekeepingTaskType.MANUAL,
      priority: HousekeepingPriority.HIGH,
    };
    const query = {
      page: 2,
      limit: 10,
      roomId: 12,
    };

    controller.createTask(currentUser, createDto);
    controller.listTasks(currentUser, query);

    expect(housekeepingService.create).toHaveBeenCalledWith(
      currentUser,
      createDto,
    );
    expect(housekeepingService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates assigned task listing', () => {
    const query = {
      page: 1,
      limit: 20,
    };

    controller.listMyAssignedTasks(currentUser, query);

    expect(housekeepingService.listAssignedToMe).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates task detail and update', () => {
    const updateDto = {
      priority: HousekeepingPriority.URGENT,
      notes: 'Needs immediate attention.',
    };

    controller.getTaskById(currentUser, 9);
    controller.updateTask(currentUser, 9, updateDto);

    expect(housekeepingService.getById).toHaveBeenCalledWith(currentUser, 9);
    expect(housekeepingService.update).toHaveBeenCalledWith(
      currentUser,
      9,
      updateDto,
    );
  });

  it('delegates assignment, reassignment, and cancellation', () => {
    const assignDto = {
      assignedToUserId: 7,
      notes: 'Start after checkout.',
    };
    const reassignDto = {
      assignedToUserId: 8,
      notes: 'Move to evening attendant.',
    };
    const cancelDto = {
      reason: 'Guest extended stay.',
    };

    controller.assignTask(currentUser, 9, assignDto);
    controller.reassignTask(currentUser, 9, reassignDto);
    controller.cancelTask(currentUser, 9, cancelDto);

    expect(housekeepingService.assign).toHaveBeenCalledWith(
      currentUser,
      9,
      assignDto,
    );
    expect(housekeepingService.reassign).toHaveBeenCalledWith(
      currentUser,
      9,
      reassignDto,
    );
    expect(housekeepingService.cancel).toHaveBeenCalledWith(
      currentUser,
      9,
      cancelDto,
    );
  });

  it('delegates task start and completion with permission keys', () => {
    const startPermissionKeys = ['housekeeping.tasks.start.assigned'];
    const completePermissionKeys = ['housekeeping.tasks.complete.assigned'];
    const startDto = {
      notes: 'Starting now.',
    };
    const completeDto = {
      completionNotes: 'Room cleaned.',
    };

    controller.startTask(currentUser, startPermissionKeys, 9, startDto);
    controller.completeTask(
      currentUser,
      completePermissionKeys,
      9,
      completeDto,
    );

    expect(housekeepingService.start).toHaveBeenCalledWith(
      currentUser,
      startPermissionKeys,
      9,
      startDto,
    );
    expect(housekeepingService.complete).toHaveBeenCalledWith(
      currentUser,
      completePermissionKeys,
      9,
      completeDto,
    );
  });
});
