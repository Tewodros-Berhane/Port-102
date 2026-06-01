import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import {
  HousekeepingPriority,
  HousekeepingTaskType,
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
    getById: jest.Mock;
    update: jest.Mock;
    assign: jest.Mock;
    reassign: jest.Mock;
    start: jest.Mock;
    complete: jest.Mock;
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
