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
  AssetStatus,
  MaintenanceIssueType,
  MaintenancePriority,
  MaintenanceTicketSource,
  MaintenanceTicketStatus,
  PreventiveMaintenanceStatus,
  RoomMaintenanceStatus,
} from '../src/generated/prisma/client';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../src/modules/auth/types/current-user-payload.type';
import { MaintenanceService } from '../src/modules/maintenance/maintenance.service';

type TestUser = CurrentUserPayload & {
  permissions: string[];
};

type RequestWithTestUser = {
  headers: {
    authorization?: string;
  };
  user?: TestUser;
  permissionKeys?: string[];
};

const supervisorUser: TestUser = {
  sub: 1,
  email: 'maintenance.supervisor@demo-hotel.com',
  roleKey: 'MAINTENANCE_SUPERVISOR',
  roleId: 8,
  departmentId: 4,
  tokenVersion: 0,
  permissions: [
    'maintenance.dashboard.read',
    'maintenance.tickets.create',
    'maintenance.tickets.read',
    'maintenance.tickets.assign',
    'maintenance.tickets.update',
    'maintenance.tickets.approve',
    'maintenance.photos.upload',
    'preventive_maintenance.create',
    'preventive_maintenance.read',
    'preventive_maintenance.update',
    'preventive_maintenance.delete',
    'assets.create',
    'assets.read',
    'assets.update',
    'assets.delete',
    'rooms.out_of_order.mark',
    'rooms.out_of_order.clear',
  ],
};

const technicianUser: TestUser = {
  sub: 9,
  email: 'technician@demo-hotel.com',
  roleKey: 'MAINTENANCE_TECHNICIAN',
  roleId: 9,
  departmentId: 4,
  tokenVersion: 0,
  permissions: [
    'maintenance.tickets.read.assigned',
    'maintenance.tickets.start.assigned',
    'maintenance.tickets.update.assigned',
    'maintenance.tickets.complete.assigned',
  ],
};

const limitedUser: TestUser = {
  ...supervisorUser,
  sub: 2,
  email: 'limited@demo-hotel.com',
  permissions: ['rooms.read'],
};

const usersByToken = new Map<string, TestUser>([
  ['supervisor-token', supervisorUser],
  ['technician-token', technicianUser],
  ['limited-token', limitedUser],
]);

const ticket = {
  id: 30,
  ticketNumber: 'MNT-20260607-123450',
  roomId: 12,
  assetId: null,
  source: MaintenanceTicketSource.MANUAL,
  sourceType: null,
  sourceId: null,
  issueType: MaintenanceIssueType.HVAC,
  status: MaintenanceTicketStatus.OPEN,
  priority: MaintenancePriority.HIGH,
  title: 'AC leaking',
  description: 'Water is dripping from the indoor unit.',
  assignedToUserId: null,
};

const asset = {
  id: 4,
  assetNumber: 'AST-HVAC-0004',
  name: 'Room 204 AC',
  category: 'HVAC',
  roomId: 12,
  status: AssetStatus.ACTIVE,
};

const preventivePlan = {
  id: 6,
  planNumber: 'PMP-20260607-123450',
  assetId: 4,
  roomId: 12,
  title: 'Quarterly AC service',
  status: PreventiveMaintenanceStatus.ACTIVE,
  intervalDays: 90,
  nextDueDate: '2026-09-05T00:00:00.000Z',
};

function requiredPermissions(context: ExecutionContext) {
  return [
    ...((Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, context.getClass()) as
      | string[]
      | undefined) ?? []),
    ...((Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, context.getHandler()) as
      | string[]
      | undefined) ?? []),
  ];
}

function anyRequiredPermissions(context: ExecutionContext) {
  return [
    ...((Reflect.getMetadata(
      ANY_REQUIRED_PERMISSIONS_KEY,
      context.getClass(),
    ) as string[] | undefined) ?? []),
    ...((Reflect.getMetadata(
      ANY_REQUIRED_PERMISSIONS_KEY,
      context.getHandler(),
    ) as string[] | undefined) ?? []),
  ];
}

describe('Maintenance API (e2e)', () => {
  let app: INestApplication;

  const maintenanceService = {
    getDashboard: jest.fn(),
    createTicket: jest.fn(),
    listTickets: jest.fn(),
    listAssignedToMe: jest.fn(),
    getTicketById: jest.fn(),
    updateTicket: jest.fn(),
    assignTicket: jest.fn(),
    startTicket: jest.fn(),
    completeTicket: jest.fn(),
    approveTicket: jest.fn(),
    rejectTicket: jest.fn(),
    cancelTicket: jest.fn(),
    addTicketNote: jest.fn(),
    addTicketPhoto: jest.fn(),
    createTicketFromHousekeepingIssue: jest.fn(),
    markRoomOutOfOrder: jest.fn(),
    markRoomUnderMaintenance: jest.fn(),
    clearRoomMaintenance: jest.fn(),
    createAsset: jest.fn(),
    listAssets: jest.fn(),
    getAssetById: jest.fn(),
    updateAsset: jest.fn(),
    deactivateAsset: jest.fn(),
    createPreventivePlan: jest.fn(),
    listPreventivePlans: jest.fn(),
    getPreventivePlanById: jest.fn(),
    updatePreventivePlan: jest.fn(),
    deletePreventivePlan: jest.fn(),
    createTicketFromPreventivePlan: jest.fn(),
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

          if (!token || !usersByToken.has(token)) {
            throw new UnauthorizedException('Authentication required.');
          }

          httpRequest.user = usersByToken.get(token);
          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const required = requiredPermissions(context);
          const anyRequired = anyRequiredPermissions(context);
          const httpRequest = context
            .switchToHttp()
            .getRequest<RequestWithTestUser>();
          const userPermissions = httpRequest.user?.permissions ?? [];
          const hasRequired = required.every((permission) =>
            userPermissions.includes(permission),
          );
          const hasAny =
            anyRequired.length === 0 ||
            anyRequired.some((permission) =>
              userPermissions.includes(permission),
            );

          if (!hasRequired || !hasAny) {
            throw new ForbiddenException('Missing required permission.');
          }

          httpRequest.permissionKeys = userPermissions;
          return true;
        },
      })
      .overrideProvider(MaintenanceService)
      .useValue(maintenanceService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    maintenanceService.getDashboard.mockResolvedValue({
      openTickets: 1,
      assignedTickets: 1,
      inProgressTickets: 0,
      completedPendingApproval: 0,
      approvedToday: 0,
      rejectedToday: 0,
      urgentTickets: 0,
      outOfOrderRooms: 1,
      underMaintenanceRooms: 0,
      assetsUnderMaintenance: 0,
      overduePreventivePlans: 0,
    });
    maintenanceService.createTicket.mockResolvedValue(ticket);
    maintenanceService.assignTicket.mockResolvedValue({
      ...ticket,
      status: MaintenanceTicketStatus.ASSIGNED,
      assignedToUserId: technicianUser.sub,
    });
    maintenanceService.listAssignedToMe.mockResolvedValue({
      items: [
        {
          ...ticket,
          status: MaintenanceTicketStatus.ASSIGNED,
          assignedToUserId: technicianUser.sub,
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    maintenanceService.startTicket.mockResolvedValue({
      ...ticket,
      status: MaintenanceTicketStatus.IN_PROGRESS,
      assignedToUserId: technicianUser.sub,
    });
    maintenanceService.completeTicket.mockResolvedValue({
      ...ticket,
      status: MaintenanceTicketStatus.COMPLETED,
      assignedToUserId: technicianUser.sub,
    });
    maintenanceService.approveTicket.mockResolvedValue({
      ...ticket,
      status: MaintenanceTicketStatus.APPROVED,
    });
    maintenanceService.markRoomOutOfOrder.mockResolvedValue({
      id: 12,
      maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
    });
    maintenanceService.clearRoomMaintenance.mockResolvedValue({
      id: 12,
      maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
    });
    maintenanceService.createTicketFromHousekeepingIssue.mockResolvedValue({
      ...ticket,
      source: MaintenanceTicketSource.HOUSEKEEPING,
      sourceType: 'HOUSEKEEPING_ISSUE',
      sourceId: 15,
    });
    maintenanceService.createAsset.mockResolvedValue(asset);
    maintenanceService.listAssets.mockResolvedValue({
      items: [asset],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    maintenanceService.getAssetById.mockResolvedValue(asset);
    maintenanceService.updateAsset.mockResolvedValue({
      ...asset,
      name: 'Updated Room 204 AC',
    });
    maintenanceService.deactivateAsset.mockResolvedValue({
      ...asset,
      status: AssetStatus.INACTIVE,
    });
    maintenanceService.createPreventivePlan.mockResolvedValue(preventivePlan);
    maintenanceService.createTicketFromPreventivePlan.mockResolvedValue({
      ticket: {
        ...ticket,
        source: MaintenanceTicketSource.PREVENTIVE,
        sourceType: 'PREVENTIVE_PLAN',
        sourceId: preventivePlan.id,
      },
      preventivePlan,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated maintenance requests', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/maintenance/dashboard')
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      message: 'Authentication required.',
    });
    expect(maintenanceService.getDashboard).not.toHaveBeenCalled();
  });

  it('rejects users without the required permission', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/maintenance/tickets')
      .set('Authorization', 'Bearer limited-token')
      .send({
        title: 'AC leaking',
      })
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Missing required permission.',
    });
    expect(maintenanceService.createTicket).not.toHaveBeenCalled();
  });

  it('allows a supervisor to create and assign a ticket', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/maintenance/tickets')
      .set('Authorization', 'Bearer supervisor-token')
      .send({
        roomId: 12,
        title: 'AC leaking',
        issueType: MaintenanceIssueType.HVAC,
        priority: MaintenancePriority.HIGH,
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      success: true,
      data: {
        id: 30,
        status: MaintenanceTicketStatus.OPEN,
      },
    });
    expect(maintenanceService.createTicket).toHaveBeenCalledWith(
      expect.objectContaining({ sub: supervisorUser.sub }),
      expect.objectContaining({
        roomId: 12,
        title: 'AC leaking',
      }),
    );

    const assignResponse = await request(app.getHttpServer())
      .patch('/api/maintenance/tickets/30/assign')
      .set('Authorization', 'Bearer supervisor-token')
      .send({
        assignedToUserId: technicianUser.sub,
      })
      .expect(200);

    expect(assignResponse.body).toMatchObject({
      data: {
        status: MaintenanceTicketStatus.ASSIGNED,
        assignedToUserId: technicianUser.sub,
      },
    });
  });

  it('allows a technician to list, start, and complete assigned tickets', async () => {
    await request(app.getHttpServer())
      .get('/api/maintenance/tickets/assigned/me')
      .set('Authorization', 'Bearer technician-token')
      .expect(200);
    expect(maintenanceService.listAssignedToMe).toHaveBeenCalledWith(
      expect.objectContaining({ sub: technicianUser.sub }),
      expect.objectContaining({
        page: 1,
        limit: 20,
      }),
    );

    await request(app.getHttpServer())
      .patch('/api/maintenance/tickets/30/start')
      .set('Authorization', 'Bearer technician-token')
      .send({
        markRoomUnderMaintenance: true,
      })
      .expect(200);
    expect(maintenanceService.startTicket).toHaveBeenCalledWith(
      expect.objectContaining({ sub: technicianUser.sub }),
      expect.arrayContaining(['maintenance.tickets.start.assigned']),
      30,
      expect.objectContaining({
        markRoomUnderMaintenance: true,
      }),
    );

    const completeResponse = await request(app.getHttpServer())
      .patch('/api/maintenance/tickets/30/complete')
      .set('Authorization', 'Bearer technician-token')
      .send({
        completionNotes: 'Drain line cleared.',
      })
      .expect(200);

    expect(completeResponse.body).toMatchObject({
      data: {
        status: MaintenanceTicketStatus.COMPLETED,
      },
    });
    expect(maintenanceService.completeTicket).toHaveBeenCalledWith(
      expect.objectContaining({ sub: technicianUser.sub }),
      expect.arrayContaining(['maintenance.tickets.complete.assigned']),
      30,
      expect.objectContaining({
        completionNotes: 'Drain line cleared.',
      }),
    );
  });

  it('allows a supervisor to approve a completed ticket', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/maintenance/tickets/30/approve')
      .set('Authorization', 'Bearer supervisor-token')
      .send({
        clearMaintenance: true,
        approvalNotes: 'Repair inspected.',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        status: MaintenanceTicketStatus.APPROVED,
      },
    });
    expect(maintenanceService.approveTicket).toHaveBeenCalledWith(
      expect.objectContaining({ sub: supervisorUser.sub }),
      30,
      expect.objectContaining({
        clearMaintenance: true,
      }),
    );
  });

  it('marks a room out of order and clears maintenance', async () => {
    const markResponse = await request(app.getHttpServer())
      .patch('/api/maintenance/rooms/12/mark-out-of-order')
      .set('Authorization', 'Bearer supervisor-token')
      .send({
        reason: 'Major water leak.',
      })
      .expect(200);

    expect(markResponse.body).toMatchObject({
      data: {
        maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
      },
    });

    const clearResponse = await request(app.getHttpServer())
      .patch('/api/maintenance/rooms/12/clear-maintenance')
      .set('Authorization', 'Bearer supervisor-token')
      .send({
        reason: 'Repair completed.',
      })
      .expect(200);

    expect(clearResponse.body).toMatchObject({
      data: {
        maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      },
    });
  });

  it('creates a ticket from a housekeeping issue', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/maintenance/tickets/from-housekeeping-issue/15')
      .set('Authorization', 'Bearer supervisor-token')
      .send({
        issueType: MaintenanceIssueType.ELECTRICAL,
        priority: MaintenancePriority.HIGH,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      data: {
        source: MaintenanceTicketSource.HOUSEKEEPING,
        sourceType: 'HOUSEKEEPING_ISSUE',
        sourceId: 15,
      },
    });
    expect(
      maintenanceService.createTicketFromHousekeepingIssue,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ sub: supervisorUser.sub }),
      15,
      expect.objectContaining({
        issueType: MaintenanceIssueType.ELECTRICAL,
      }),
    );
  });

  it('supports asset create, list, detail, update, and deactivation', async () => {
    await request(app.getHttpServer())
      .post('/api/maintenance/assets')
      .set('Authorization', 'Bearer supervisor-token')
      .send({
        assetNumber: 'AST-HVAC-0004',
        name: 'Room 204 AC',
        category: 'HVAC',
        roomId: 12,
      })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/maintenance/assets')
      .set('Authorization', 'Bearer supervisor-token')
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/maintenance/assets/4')
      .set('Authorization', 'Bearer supervisor-token')
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/maintenance/assets/4')
      .set('Authorization', 'Bearer supervisor-token')
      .send({
        name: 'Updated Room 204 AC',
      })
      .expect(200);
    const deleteResponse = await request(app.getHttpServer())
      .delete('/api/maintenance/assets/4')
      .set('Authorization', 'Bearer supervisor-token')
      .expect(200);

    expect(deleteResponse.body).toMatchObject({
      data: {
        status: AssetStatus.INACTIVE,
      },
    });
    expect(maintenanceService.createAsset).toHaveBeenCalled();
    expect(maintenanceService.listAssets).toHaveBeenCalled();
    expect(maintenanceService.getAssetById).toHaveBeenCalled();
    expect(maintenanceService.updateAsset).toHaveBeenCalled();
    expect(maintenanceService.deactivateAsset).toHaveBeenCalled();
  });

  it('creates a preventive plan and generates a maintenance ticket', async () => {
    await request(app.getHttpServer())
      .post('/api/maintenance/preventive-plans')
      .set('Authorization', 'Bearer supervisor-token')
      .send({
        assetId: 4,
        roomId: 12,
        title: 'Quarterly AC service',
        intervalDays: 90,
        nextDueDate: '2026-09-05',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/maintenance/preventive-plans/6/create-ticket')
      .set('Authorization', 'Bearer supervisor-token')
      .send({
        issueType: MaintenanceIssueType.HVAC,
        priority: MaintenancePriority.NORMAL,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      data: {
        ticket: {
          source: MaintenanceTicketSource.PREVENTIVE,
          sourceType: 'PREVENTIVE_PLAN',
          sourceId: 6,
        },
      },
    });
    expect(maintenanceService.createPreventivePlan).toHaveBeenCalled();
    expect(
      maintenanceService.createTicketFromPreventivePlan,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ sub: supervisorUser.sub }),
      6,
      expect.objectContaining({
        issueType: MaintenanceIssueType.HVAC,
      }),
    );
  });
});
