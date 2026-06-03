import {
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import {
  ANY_REQUIRED_PERMISSIONS_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from '../src/common/decorators/permissions.decorator';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import {
  HousekeepingIssueStatus,
  HousekeepingPriority,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  RoomCleaningStatus,
} from '../src/generated/prisma/client';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../src/modules/auth/types/current-user-payload.type';
import { HousekeepingService } from '../src/modules/housekeeping/housekeeping.service';

type TestUser = CurrentUserPayload & {
  permissions: string[];
};

type RequestWithTestUser = {
  headers: {
    authorization?: string;
  };
  user?: TestUser;
};

const supervisorUser: TestUser = {
  sub: 1,
  email: 'supervisor@demo-hotel.com',
  roleKey: 'HOUSEKEEPING_SUPERVISOR',
  roleId: 6,
  departmentId: 3,
  tokenVersion: 0,
  permissions: [
    'housekeeping.dashboard.read',
    'housekeeping.productivity.read',
    'housekeeping.tasks.create',
    'housekeeping.tasks.read',
    'housekeeping.tasks.assign',
    'housekeeping.tasks.reassign',
    'housekeeping.tasks.inspect',
    'housekeeping.tasks.approve',
    'housekeeping.issues.report',
    'housekeeping.issues.read',
    'room_cleaning_status.update',
  ],
};

const attendantUser: TestUser = {
  sub: 7,
  email: 'attendant@demo-hotel.com',
  roleKey: 'HOUSEKEEPING_ATTENDANT',
  roleId: 7,
  departmentId: 3,
  tokenVersion: 0,
  permissions: [
    'housekeeping.tasks.read.assigned',
    'housekeeping.tasks.start.assigned',
    'housekeeping.tasks.complete.assigned',
    'housekeeping.issues.report',
    'room_cleaning_status.update.assigned',
  ],
};

const limitedUser: TestUser = {
  ...supervisorUser,
  sub: 2,
  email: 'limited@demo-hotel.com',
  permissions: ['housekeeping.issues.report'],
};

const testUsersByToken = new Map<string, TestUser>([
  ['supervisor-token', supervisorUser],
  ['attendant-token', attendantUser],
  ['limited-token', limitedUser],
]);

const task = {
  id: 9,
  taskNumber: 'HKT-20260603-123450',
  roomId: 12,
  type: HousekeepingTaskType.CHECKOUT_CLEANING,
  status: HousekeepingTaskStatus.ASSIGNED,
  priority: HousekeepingPriority.NORMAL,
  assignedToUserId: 7,
  room: {
    id: 12,
    roomNumber: '101',
    cleaningStatus: RoomCleaningStatus.DIRTY,
  },
};

const issue = {
  id: 15,
  issueNumber: 'HKI-20260603-123450',
  roomId: 12,
  taskId: 9,
  status: HousekeepingIssueStatus.OPEN,
  title: 'Broken lamp',
  description: 'Lamp does not turn on.',
};

function getRequiredPermissions(context: ExecutionContext) {
  const controllerPermissions =
    (Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, context.getClass()) as
      | string[]
      | undefined) ?? [];
  const handlerPermissions =
    (Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, context.getHandler()) as
      | string[]
      | undefined) ?? [];

  return [...controllerPermissions, ...handlerPermissions];
}

function getAnyRequiredPermissions(context: ExecutionContext) {
  const controllerPermissions =
    (Reflect.getMetadata(ANY_REQUIRED_PERMISSIONS_KEY, context.getClass()) as
      | string[]
      | undefined) ?? [];
  const handlerPermissions =
    (Reflect.getMetadata(ANY_REQUIRED_PERMISSIONS_KEY, context.getHandler()) as
      | string[]
      | undefined) ?? [];

  return [...controllerPermissions, ...handlerPermissions];
}

describe('Housekeeping API (e2e)', () => {
  let app: INestApplication;

  const housekeepingService = {
    getDashboard: jest.fn(),
    getProductivity: jest.fn(),
    create: jest.fn(),
    list: jest.fn(),
    listAssignedToMe: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    assign: jest.fn(),
    reassign: jest.fn(),
    start: jest.fn(),
    complete: jest.fn(),
    inspect: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
    updateRoomCleaningStatus: jest.fn(),
    reportIssue: jest.fn(),
    listIssues: jest.fn(),
    getIssueById: jest.fn(),
    resolveIssue: jest.fn(),
    cancelIssue: jest.fn(),
  };

  beforeAll(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://postgres:postgres@localhost:5432/port_102?schema=public';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const httpRequest = context
            .switchToHttp()
            .getRequest<RequestWithTestUser>();
          const token = httpRequest.headers.authorization?.replace(
            /^Bearer\s+/i,
            '',
          );

          if (!token || !testUsersByToken.has(token)) {
            throw new UnauthorizedException('Authentication required.');
          }

          httpRequest.user = testUsersByToken.get(token);

          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const requiredPermissions = getRequiredPermissions(context);
          const anyRequiredPermissions = getAnyRequiredPermissions(context);
          const httpRequest = context
            .switchToHttp()
            .getRequest<RequestWithTestUser>();
          const userPermissions = httpRequest.user?.permissions ?? [];

          const hasRequiredPermissions = requiredPermissions.every(
            (permission) => userPermissions.includes(permission),
          );
          const hasAnyRequiredPermission =
            anyRequiredPermissions.length === 0 ||
            anyRequiredPermissions.some((permission) =>
              userPermissions.includes(permission),
            );

          if (hasRequiredPermissions && hasAnyRequiredPermission) {
            httpRequest.user = {
              ...httpRequest.user,
              permissions: userPermissions,
            } as TestUser;
            (
              httpRequest as RequestWithTestUser & { permissionKeys: string[] }
            ).permissionKeys = userPermissions;

            return true;
          }

          throw new ForbiddenException('Missing required permission.');
        },
      })
      .overrideProvider(HousekeepingService)
      .useValue(housekeepingService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    housekeepingService.getDashboard.mockResolvedValue({
      pendingTasks: 1,
      openIssues: 1,
      dirtyRooms: 3,
    });
    housekeepingService.getProductivity.mockResolvedValue({
      items: [
        {
          attendant: {
            id: 7,
            email: 'attendant@demo-hotel.com',
            fullName: 'Housekeeping Attendant',
          },
          assignedCount: 2,
          completedCount: 1,
          approvedCount: 1,
          rejectedCount: 0,
          averageCompletionMinutes: 45,
        },
      ],
    });
    housekeepingService.create.mockResolvedValue(task);
    housekeepingService.list.mockResolvedValue({
      items: [task],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    housekeepingService.listAssignedToMe.mockResolvedValue({
      items: [task],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    housekeepingService.start.mockResolvedValue({
      ...task,
      status: HousekeepingTaskStatus.IN_PROGRESS,
    });
    housekeepingService.complete.mockResolvedValue({
      ...task,
      status: HousekeepingTaskStatus.INSPECTION_PENDING,
      room: {
        ...task.room,
        cleaningStatus: RoomCleaningStatus.CLEAN,
      },
    });
    housekeepingService.approve.mockResolvedValue({
      ...task,
      status: HousekeepingTaskStatus.APPROVED,
      room: {
        ...task.room,
        cleaningStatus: RoomCleaningStatus.INSPECTED,
      },
    });
    housekeepingService.updateRoomCleaningStatus.mockResolvedValue({
      id: 12,
      roomNumber: '101',
      cleaningStatus: RoomCleaningStatus.INSPECTED,
    });
    housekeepingService.reportIssue.mockResolvedValue(issue);
    housekeepingService.listIssues.mockResolvedValue({
      items: [issue],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    housekeepingService.resolveIssue.mockResolvedValue({
      ...issue,
      status: HousekeepingIssueStatus.RESOLVED,
      resolutionNotes: 'Lamp was replaced.',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated housekeeping requests', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/housekeeping/tasks')
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      message: 'Authentication required.',
    });
    expect(housekeepingService.list).not.toHaveBeenCalled();
  });

  it('rejects users without task read permission', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/housekeeping/tasks')
      .set('Authorization', 'Bearer limited-token')
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Missing required permission.',
    });
    expect(housekeepingService.list).not.toHaveBeenCalled();
  });

  it('allows a supervisor to create and list housekeeping tasks', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/housekeeping/tasks')
      .set('Authorization', 'Bearer supervisor-token')
      .send({
        roomId: 12,
        type: HousekeepingTaskType.MANUAL,
        priority: HousekeepingPriority.HIGH,
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      success: true,
      data: {
        id: 9,
        roomId: 12,
      },
    });
    expect(housekeepingService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.objectContaining({
        roomId: 12,
        type: HousekeepingTaskType.MANUAL,
        priority: HousekeepingPriority.HIGH,
      }),
    );

    const listResponse = await request(app.getHttpServer())
      .get('/api/housekeeping/tasks')
      .set('Authorization', 'Bearer supervisor-token')
      .expect(200);

    expect(listResponse.body).toMatchObject({
      success: true,
      data: {
        items: [
          {
            id: 9,
          },
        ],
      },
    });
  });

  it('allows an attendant to list, start, and complete assigned tasks', async () => {
    await request(app.getHttpServer())
      .get('/api/housekeeping/tasks/assigned/me')
      .set('Authorization', 'Bearer attendant-token')
      .expect(200);
    expect(housekeepingService.listAssignedToMe).toHaveBeenCalled();

    await request(app.getHttpServer())
      .patch('/api/housekeeping/tasks/9/start')
      .set('Authorization', 'Bearer attendant-token')
      .send({
        notes: 'Starting now.',
      })
      .expect(200);
    expect(housekeepingService.start).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 7,
      }),
      expect.arrayContaining(['housekeeping.tasks.start.assigned']),
      9,
      expect.objectContaining({
        notes: 'Starting now.',
      }),
    );

    const completeResponse = await request(app.getHttpServer())
      .patch('/api/housekeeping/tasks/9/complete')
      .set('Authorization', 'Bearer attendant-token')
      .send({
        completionNotes: 'Room cleaned.',
      })
      .expect(200);

    expect(completeResponse.body).toMatchObject({
      data: {
        status: HousekeepingTaskStatus.INSPECTION_PENDING,
        room: {
          cleaningStatus: RoomCleaningStatus.CLEAN,
        },
      },
    });
  });

  it('allows a supervisor to approve a completed task and mark the room inspected', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/housekeeping/tasks/9/approve')
      .set('Authorization', 'Bearer supervisor-token')
      .send({
        inspectionNotes: 'Passed inspection.',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        status: HousekeepingTaskStatus.APPROVED,
        room: {
          cleaningStatus: RoomCleaningStatus.INSPECTED,
        },
      },
    });
    expect(housekeepingService.approve).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      9,
      expect.objectContaining({
        inspectionNotes: 'Passed inspection.',
      }),
    );
  });

  it('allows permitted users to update room cleaning status', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/housekeeping/rooms/12/cleaning-status')
      .set('Authorization', 'Bearer supervisor-token')
      .send({
        cleaningStatus: RoomCleaningStatus.INSPECTED,
        reason: 'Manual supervisor update.',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        id: 12,
        cleaningStatus: RoomCleaningStatus.INSPECTED,
      },
    });
    expect(housekeepingService.updateRoomCleaningStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.arrayContaining(['room_cleaning_status.update']),
      12,
      expect.objectContaining({
        cleaningStatus: RoomCleaningStatus.INSPECTED,
      }),
    );
  });

  it('returns dashboard and productivity summaries', async () => {
    await request(app.getHttpServer())
      .get('/api/housekeeping/dashboard')
      .query({
        date: '2026-06-03',
      })
      .set('Authorization', 'Bearer supervisor-token')
      .expect(200);
    expect(housekeepingService.getDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.objectContaining({
        date: '2026-06-03',
      }),
    );

    const productivityResponse = await request(app.getHttpServer())
      .get('/api/housekeeping/productivity')
      .query({
        from: '2026-06-01',
        to: '2026-06-03',
      })
      .set('Authorization', 'Bearer supervisor-token')
      .expect(200);

    expect(productivityResponse.body).toMatchObject({
      data: {
        items: [
          {
            assignedCount: 2,
            averageCompletionMinutes: 45,
          },
        ],
      },
    });
  });

  it('reports and resolves housekeeping issues', async () => {
    const reportResponse = await request(app.getHttpServer())
      .post('/api/housekeeping/issues')
      .set('Authorization', 'Bearer attendant-token')
      .send({
        roomId: 12,
        taskId: 9,
        title: 'Broken lamp',
        description: 'Lamp does not turn on.',
      })
      .expect(201);

    expect(reportResponse.body).toMatchObject({
      data: {
        id: 15,
        status: HousekeepingIssueStatus.OPEN,
      },
    });
    expect(housekeepingService.reportIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 7,
      }),
      expect.objectContaining({
        roomId: 12,
        taskId: 9,
        title: 'Broken lamp',
      }),
    );

    const resolveResponse = await request(app.getHttpServer())
      .patch('/api/housekeeping/issues/15/resolve')
      .set('Authorization', 'Bearer supervisor-token')
      .send({
        resolutionNotes: 'Lamp was replaced.',
      })
      .expect(200);

    expect(resolveResponse.body).toMatchObject({
      data: {
        status: HousekeepingIssueStatus.RESOLVED,
        resolutionNotes: 'Lamp was replaced.',
      },
    });
    expect(housekeepingService.resolveIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      15,
      expect.objectContaining({
        resolutionNotes: 'Lamp was replaced.',
      }),
    );
  });
});
