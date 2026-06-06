import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  AssetStatus,
  HousekeepingIssueStatus,
  MaintenanceIssueType,
  MaintenancePriority,
  MaintenanceTicketSource,
  MaintenanceTicketStatus,
  PreventiveMaintenanceStatus,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
  UserStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { HousekeepingIssuesRepository } from '../housekeeping/repositories/housekeeping-issues.repository';
import { RoomsRepository } from '../rooms/repositories/rooms.repository';
import { MaintenanceService } from './maintenance.service';
import { AssetsRepository } from './repositories/assets.repository';
import { MaintenanceTicketNotesRepository } from './repositories/maintenance-ticket-notes.repository';
import { MaintenanceTicketPhotosRepository } from './repositories/maintenance-ticket-photos.repository';
import { MaintenanceTicketsRepository } from './repositories/maintenance-tickets.repository';
import { PreventiveMaintenancePlansRepository } from './repositories/preventive-maintenance-plans.repository';

const currentUser = {
  sub: 1,
  email: 'supervisor@demo-hotel.com',
  roleKey: 'MAINTENANCE_SUPERVISOR',
  roleId: 8,
  departmentId: 4,
  tokenVersion: 0,
};

const now = new Date('2026-06-04T10:00:00.000Z');

function createRoom(overrides: Record<string, unknown> = {}) {
  return {
    id: 12,
    roomNumber: '204',
    displayName: 'Deluxe 204',
    floorId: 2,
    roomTypeId: 3,
    occupancyStatus: RoomOccupancyStatus.VACANT,
    cleaningStatus: RoomCleaningStatus.CLEAN,
    maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
    notes: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    floor: {
      id: 2,
      number: 2,
      name: 'Second Floor',
      isActive: true,
    },
    roomType: {
      id: 3,
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

function createAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: 4,
    assetNumber: 'AST-0004',
    name: 'Room 204 AC',
    category: 'HVAC',
    location: 'Room 204',
    roomId: 12,
    status: AssetStatus.ACTIVE,
    description: null,
    purchaseDate: null,
    warrantyUntil: null,
    createdAt: now,
    updatedAt: now,
    room: {
      id: 12,
      roomNumber: '204',
      displayName: 'Deluxe 204',
      maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      isActive: true,
    },
    ...overrides,
  };
}

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 9,
    email: 'tech@demo-hotel.com',
    fullName: 'Maintenance Tech',
    status: UserStatus.ACTIVE,
    ...overrides,
  };
}

function createTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 30,
    ticketNumber: 'MNT-20260604-123450',
    roomId: 12,
    assetId: null,
    source: MaintenanceTicketSource.MANUAL,
    sourceType: null,
    sourceId: null,
    issueType: MaintenanceIssueType.HVAC,
    status: MaintenanceTicketStatus.OPEN,
    priority: MaintenancePriority.NORMAL,
    title: 'AC leaking',
    description: null,
    reportedByUserId: 1,
    assignedToUserId: null,
    assignedByUserId: null,
    assignedAt: null,
    startedAt: null,
    completedAt: null,
    approvedAt: null,
    rejectedAt: null,
    cancelledAt: null,
    completedByUserId: null,
    approvedByUserId: null,
    rejectedByUserId: null,
    cancelledByUserId: null,
    completionNotes: null,
    approvalNotes: null,
    rejectionReason: null,
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
    room: createRoom(),
    asset: null,
    reportedBy: createUser({ id: 1 }),
    assignedTo: null,
    assignedBy: null,
    completedBy: null,
    approvedBy: null,
    rejectedBy: null,
    cancelledBy: null,
    notes: [],
    photos: [],
    ...overrides,
  };
}

function createHousekeepingIssue(overrides: Record<string, unknown> = {}) {
  return {
    id: 19,
    issueNumber: 'HKI-20260604-123450',
    taskId: null,
    roomId: 12,
    reportedByUserId: 7,
    status: HousekeepingIssueStatus.OPEN,
    title: 'Bathroom exhaust fan is not working',
    description: 'Fan does not start from the wall switch.',
    photoUrl: null,
    resolvedAt: null,
    resolvedByUserId: null,
    resolutionNotes: null,
    createdAt: now,
    updatedAt: now,
    room: createRoom(),
    task: null,
    reportedBy: createUser({ id: 7 }),
    resolvedBy: null,
    ...overrides,
  };
}

function createPreventivePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: 6,
    planNumber: 'PMP-20260604-123450',
    assetId: 4,
    roomId: 12,
    title: 'Quarterly AC service',
    description: 'Inspect filters and drain line.',
    status: PreventiveMaintenanceStatus.ACTIVE,
    intervalDays: 90,
    nextDueDate: new Date('2026-09-01T00:00:00.000Z'),
    lastCompletedAt: null,
    createdByUserId: 1,
    createdAt: now,
    updatedAt: now,
    asset: {
      id: 4,
      assetNumber: 'AST-0004',
      name: 'Room 204 AC',
      category: 'HVAC',
      status: AssetStatus.ACTIVE,
    },
    room: {
      id: 12,
      roomNumber: '204',
      displayName: 'Deluxe 204',
      maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      isActive: true,
    },
    createdBy: createUser({ id: 1 }),
    ...overrides,
  };
}

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let maintenanceTicketsRepository: {
    createTicket: jest.Mock;
    findTicket: jest.Mock;
    findByTicketNumber: jest.Mock;
    updateTicket: jest.Mock;
    runInTransaction: jest.Mock;
    listTickets: jest.Mock;
    findActiveUser: jest.Mock;
    findActiveTicketBySource: jest.Mock;
    countTickets: jest.Mock;
  };
  let assetsRepository: {
    createAsset: jest.Mock;
    findAsset: jest.Mock;
    findActiveAsset: jest.Mock;
    findByAssetNumber: jest.Mock;
    listAssets: jest.Mock;
    updateAsset: jest.Mock;
    countActiveTickets: jest.Mock;
    countAssets: jest.Mock;
  };
  let maintenanceTicketNotesRepository: {
    createNote: jest.Mock;
  };
  let maintenanceTicketPhotosRepository: {
    createPhoto: jest.Mock;
  };
  let housekeepingIssuesRepository: {
    findIssue: jest.Mock;
  };
  let preventiveMaintenancePlansRepository: {
    createPlan: jest.Mock;
    findPlan: jest.Mock;
    findByPlanNumber: jest.Mock;
    listPlans: jest.Mock;
    updatePlan: jest.Mock;
    countPlans: jest.Mock;
  };
  let roomsRepository: {
    findRoom: jest.Mock;
    updateRoom: jest.Mock;
    createStatusLogs: jest.Mock;
    countRooms: jest.Mock;
  };
  let auditLogsService: {
    record: jest.Mock;
  };
  let randomSpy: jest.SpyInstance;

  beforeEach(async () => {
    maintenanceTicketsRepository = {
      createTicket: jest.fn(),
      findTicket: jest.fn(),
      findByTicketNumber: jest.fn(),
      updateTicket: jest.fn(),
      runInTransaction: jest.fn((callback) => callback({})),
      listTickets: jest.fn(),
      findActiveUser: jest.fn(),
      findActiveTicketBySource: jest.fn(),
      countTickets: jest.fn(),
    };
    assetsRepository = {
      createAsset: jest.fn(),
      findAsset: jest.fn(),
      findActiveAsset: jest.fn(),
      findByAssetNumber: jest.fn(),
      listAssets: jest.fn(),
      updateAsset: jest.fn(),
      countActiveTickets: jest.fn(),
      countAssets: jest.fn(),
    };
    maintenanceTicketNotesRepository = {
      createNote: jest.fn(),
    };
    maintenanceTicketPhotosRepository = {
      createPhoto: jest.fn(),
    };
    housekeepingIssuesRepository = {
      findIssue: jest.fn(),
    };
    preventiveMaintenancePlansRepository = {
      createPlan: jest.fn(),
      findPlan: jest.fn(),
      findByPlanNumber: jest.fn(),
      listPlans: jest.fn(),
      updatePlan: jest.fn(),
      countPlans: jest.fn(),
    };
    roomsRepository = {
      findRoom: jest.fn(),
      updateRoom: jest.fn(),
      createStatusLogs: jest.fn(),
      countRooms: jest.fn(),
    };
    auditLogsService = {
      record: jest.fn(),
    };
    jest.useFakeTimers().setSystemTime(now);
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.12345);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        {
          provide: MaintenanceTicketsRepository,
          useValue: maintenanceTicketsRepository,
        },
        {
          provide: AssetsRepository,
          useValue: assetsRepository,
        },
        {
          provide: MaintenanceTicketNotesRepository,
          useValue: maintenanceTicketNotesRepository,
        },
        {
          provide: MaintenanceTicketPhotosRepository,
          useValue: maintenanceTicketPhotosRepository,
        },
        {
          provide: HousekeepingIssuesRepository,
          useValue: housekeepingIssuesRepository,
        },
        {
          provide: PreventiveMaintenancePlansRepository,
          useValue: preventiveMaintenancePlansRepository,
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

    service = module.get<MaintenanceService>(MaintenanceService);
  });

  afterEach(() => {
    randomSpy.mockRestore();
    jest.useRealTimers();
  });

  it('returns maintenance dashboard counts', async () => {
    maintenanceTicketsRepository.countTickets
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);
    roomsRepository.countRooms
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);
    assetsRepository.countAssets.mockResolvedValue(4);
    preventiveMaintenancePlansRepository.countPlans.mockResolvedValue(5);

    const result = await service.getDashboard(currentUser);

    expect(result).toEqual({
      openTickets: 5,
      assignedTickets: 4,
      inProgressTickets: 3,
      completedPendingApproval: 2,
      approvedToday: 1,
      rejectedToday: 1,
      urgentTickets: 2,
      outOfOrderRooms: 2,
      underMaintenanceRooms: 3,
      assetsUnderMaintenance: 4,
      overduePreventivePlans: 5,
    });
    expect(maintenanceTicketsRepository.countTickets).toHaveBeenNthCalledWith(
      1,
      {
        status: MaintenanceTicketStatus.OPEN,
      },
    );
    expect(maintenanceTicketsRepository.countTickets).toHaveBeenNthCalledWith(
      7,
      {
        priority: MaintenancePriority.URGENT,
        status: {
          notIn: [
            MaintenanceTicketStatus.APPROVED,
            MaintenanceTicketStatus.CANCELLED,
          ],
        },
      },
    );
    expect(roomsRepository.countRooms).toHaveBeenCalledWith({
      isActive: true,
      maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
    });
    expect(assetsRepository.countAssets).toHaveBeenCalledWith({
      status: AssetStatus.UNDER_MAINTENANCE,
    });
    expect(
      preventiveMaintenancePlansRepository.countPlans,
    ).toHaveBeenCalledWith({
      status: PreventiveMaintenanceStatus.ACTIVE,
      nextDueDate: {
        lt: now,
      },
    });
  });

  it('creates an open maintenance ticket', async () => {
    roomsRepository.findRoom.mockResolvedValue(createRoom());
    maintenanceTicketsRepository.findByTicketNumber.mockResolvedValue(null);
    maintenanceTicketsRepository.createTicket.mockResolvedValue(createTicket());

    const result = await service.createTicket(currentUser, {
      roomId: 12,
      title: ' AC leaking ',
      issueType: MaintenanceIssueType.HVAC,
    });

    expect(maintenanceTicketsRepository.createTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketNumber: 'MNT-20260604-123450',
        roomId: 12,
        assetId: null,
        status: MaintenanceTicketStatus.OPEN,
        title: 'AC leaking',
        reportedByUserId: 1,
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 1,
        action: 'maintenance.tickets.created',
        entityType: 'MaintenanceTicket',
        entityId: '30',
      }),
    );
    expect(result.ticketNumber).toBe('MNT-20260604-123450');
  });

  it('creates an assigned maintenance ticket when an active assignee is provided', async () => {
    roomsRepository.findRoom.mockResolvedValue(createRoom());
    maintenanceTicketsRepository.findActiveUser.mockResolvedValue(createUser());
    maintenanceTicketsRepository.findByTicketNumber.mockResolvedValue(null);
    maintenanceTicketsRepository.createTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.ASSIGNED,
        assignedToUserId: 9,
        assignedByUserId: 1,
        assignedAt: now,
        assignedTo: createUser(),
        assignedBy: createUser({ id: 1 }),
      }),
    );

    await service.createTicket(currentUser, {
      roomId: 12,
      title: 'AC leaking',
      assignedToUserId: 9,
    });

    expect(maintenanceTicketsRepository.findActiveUser).toHaveBeenCalledWith(9);
    expect(maintenanceTicketsRepository.createTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        status: MaintenanceTicketStatus.ASSIGNED,
        assignedToUserId: 9,
        assignedByUserId: 1,
        assignedAt: expect.any(Date),
      }),
    );
  });

  it('creates a maintenance ticket from an open housekeeping issue', async () => {
    const issue = createHousekeepingIssue();
    housekeepingIssuesRepository.findIssue.mockResolvedValue(issue);
    roomsRepository.findRoom.mockResolvedValue(createRoom());
    maintenanceTicketsRepository.findActiveTicketBySource.mockResolvedValue(
      null,
    );
    maintenanceTicketsRepository.findActiveUser.mockResolvedValue(createUser());
    maintenanceTicketsRepository.findByTicketNumber.mockResolvedValue(null);
    maintenanceTicketsRepository.createTicket.mockResolvedValue(
      createTicket({
        source: MaintenanceTicketSource.HOUSEKEEPING,
        sourceType: 'HOUSEKEEPING_ISSUE',
        sourceId: issue.id,
        title: issue.title,
        description: issue.description,
        status: MaintenanceTicketStatus.ASSIGNED,
        priority: MaintenancePriority.HIGH,
        assignedToUserId: 9,
        assignedByUserId: currentUser.sub,
        assignedAt: now,
        assignedTo: createUser(),
        assignedBy: createUser({ id: currentUser.sub }),
      }),
    );

    const result = await service.createTicketFromHousekeepingIssue(
      currentUser,
      issue.id,
      {
        priority: MaintenancePriority.HIGH,
        assignedToUserId: 9,
      },
    );

    expect(
      maintenanceTicketsRepository.findActiveTicketBySource,
    ).toHaveBeenCalledWith({
      sourceType: 'HOUSEKEEPING_ISSUE',
      sourceId: issue.id,
    });
    expect(maintenanceTicketsRepository.createTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: issue.roomId,
        source: MaintenanceTicketSource.HOUSEKEEPING,
        sourceType: 'HOUSEKEEPING_ISSUE',
        sourceId: issue.id,
        title: issue.title,
        description: issue.description,
        status: MaintenanceTicketStatus.ASSIGNED,
        priority: MaintenancePriority.HIGH,
        reportedByUserId: currentUser.sub,
        assignedToUserId: 9,
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.tickets.created_from_housekeeping_issue',
        entityType: 'MaintenanceTicket',
        entityId: '30',
      }),
    );
    expect(result.sourceType).toBe('HOUSEKEEPING_ISSUE');
  });

  it('rejects duplicate active tickets for a housekeeping issue', async () => {
    const issue = createHousekeepingIssue();
    housekeepingIssuesRepository.findIssue.mockResolvedValue(issue);
    roomsRepository.findRoom.mockResolvedValue(createRoom());
    maintenanceTicketsRepository.findActiveTicketBySource.mockResolvedValue(
      createTicket({
        source: MaintenanceTicketSource.HOUSEKEEPING,
        sourceType: 'HOUSEKEEPING_ISSUE',
        sourceId: issue.id,
      }),
    );

    await expect(
      service.createTicketFromHousekeepingIssue(currentUser, issue.id, {}),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(maintenanceTicketsRepository.createTicket).not.toHaveBeenCalled();
  });

  it('rejects housekeeping issues that are not open', async () => {
    housekeepingIssuesRepository.findIssue.mockResolvedValue(
      createHousekeepingIssue({
        status: HousekeepingIssueStatus.RESOLVED,
      }),
    );

    await expect(
      service.createTicketFromHousekeepingIssue(currentUser, 19, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects missing housekeeping issues', async () => {
    housekeepingIssuesRepository.findIssue.mockResolvedValue(null);

    await expect(
      service.createTicketFromHousekeepingIssue(currentUser, 404, {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates an asset linked to an active room', async () => {
    roomsRepository.findRoom.mockResolvedValue(createRoom());
    assetsRepository.findByAssetNumber.mockResolvedValue(null);
    assetsRepository.createAsset.mockResolvedValue(createAsset());

    const result = await service.createAsset(currentUser, {
      assetNumber: ' AST-0004 ',
      name: ' Room 204 AC ',
      category: ' HVAC ',
      roomId: 12,
      purchaseDate: '2024-05-20',
    });

    expect(assetsRepository.createAsset).toHaveBeenCalledWith({
      assetNumber: 'AST-0004',
      name: 'Room 204 AC',
      category: 'HVAC',
      location: null,
      roomId: 12,
      status: AssetStatus.ACTIVE,
      description: null,
      purchaseDate: new Date('2024-05-20'),
      warrantyUntil: null,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.assets.created',
        entityType: 'Asset',
        entityId: '4',
      }),
    );
    expect(result.assetNumber).toBe('AST-0004');
  });

  it('rejects duplicate asset numbers', async () => {
    assetsRepository.findByAssetNumber.mockResolvedValue(createAsset());

    await expect(
      service.createAsset(currentUser, {
        assetNumber: 'AST-0004',
        name: 'Duplicate asset',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(assetsRepository.createAsset).not.toHaveBeenCalled();
  });

  it('lists assets with pagination and filters', async () => {
    assetsRepository.listAssets.mockResolvedValue([1, [createAsset()]]);

    const result = await service.listAssets(currentUser, {
      page: 2,
      limit: 10,
      search: ' AC ',
      status: AssetStatus.ACTIVE,
      category: ' HVAC ',
      roomId: 12,
    });

    expect(assetsRepository.listAssets).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'AC',
      status: AssetStatus.ACTIVE,
      category: 'HVAC',
      roomId: 12,
    });
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('returns asset details and rejects missing assets', async () => {
    assetsRepository.findAsset.mockResolvedValueOnce(createAsset());

    await expect(service.getAssetById(currentUser, 4)).resolves.toEqual(
      expect.objectContaining({
        id: 4,
        assetNumber: 'AST-0004',
      }),
    );

    assetsRepository.findAsset.mockResolvedValueOnce(null);

    await expect(service.getAssetById(currentUser, 404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates asset details and room linkage', async () => {
    assetsRepository.findAsset.mockResolvedValue(createAsset());
    assetsRepository.findByAssetNumber.mockResolvedValue(null);
    roomsRepository.findRoom.mockResolvedValue(createRoom({ id: 13 }));
    assetsRepository.updateAsset.mockResolvedValue(
      createAsset({
        assetNumber: 'AST-HVAC-0004',
        name: 'Updated AC',
        roomId: 13,
        status: AssetStatus.UNDER_MAINTENANCE,
      }),
    );

    const result = await service.updateAsset(currentUser, 4, {
      assetNumber: 'AST-HVAC-0004',
      name: ' Updated AC ',
      roomId: 13,
      status: AssetStatus.UNDER_MAINTENANCE,
    });

    expect(assetsRepository.updateAsset).toHaveBeenCalledWith(4, {
      assetNumber: 'AST-HVAC-0004',
      name: 'Updated AC',
      roomId: 13,
      status: AssetStatus.UNDER_MAINTENANCE,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.assets.updated',
        entityType: 'Asset',
      }),
    );
    expect(result.status).toBe(AssetStatus.UNDER_MAINTENANCE);
  });

  it('soft-deactivates an asset without active tickets', async () => {
    assetsRepository.findAsset.mockResolvedValue(createAsset());
    assetsRepository.countActiveTickets.mockResolvedValue(0);
    assetsRepository.updateAsset.mockResolvedValue(
      createAsset({ status: AssetStatus.INACTIVE }),
    );

    const result = await service.deactivateAsset(currentUser, 4);

    expect(assetsRepository.updateAsset).toHaveBeenCalledWith(4, {
      status: AssetStatus.INACTIVE,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.assets.deactivated',
        entityType: 'Asset',
      }),
    );
    expect(result.status).toBe(AssetStatus.INACTIVE);
  });

  it('rejects asset deactivation while active tickets exist', async () => {
    assetsRepository.findAsset.mockResolvedValue(createAsset());
    assetsRepository.countActiveTickets.mockResolvedValue(1);

    await expect(
      service.deactivateAsset(currentUser, 4),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(assetsRepository.updateAsset).not.toHaveBeenCalled();
  });

  it('creates a preventive maintenance plan linked to an asset and room', async () => {
    assetsRepository.findActiveAsset.mockResolvedValue(createAsset());
    roomsRepository.findRoom.mockResolvedValue(createRoom());
    preventiveMaintenancePlansRepository.findByPlanNumber.mockResolvedValue(
      null,
    );
    preventiveMaintenancePlansRepository.createPlan.mockResolvedValue(
      createPreventivePlan(),
    );

    const result = await service.createPreventivePlan(currentUser, {
      title: ' Quarterly AC service ',
      description: ' Inspect filters and drain line. ',
      assetId: 4,
      roomId: 12,
      intervalDays: 90,
      nextDueDate: '2026-09-01',
    });

    expect(
      preventiveMaintenancePlansRepository.createPlan,
    ).toHaveBeenCalledWith({
      planNumber: 'PMP-20260604-123450',
      assetId: 4,
      roomId: 12,
      title: 'Quarterly AC service',
      description: 'Inspect filters and drain line.',
      status: PreventiveMaintenanceStatus.ACTIVE,
      intervalDays: 90,
      nextDueDate: new Date('2026-09-01'),
      createdByUserId: 1,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.preventive_plans.created',
        entityType: 'PreventiveMaintenancePlan',
        entityId: '6',
      }),
    );
    expect(result.planNumber).toBe('PMP-20260604-123450');
  });

  it('requires a preventive plan to link to an asset or room', async () => {
    await expect(
      service.createPreventivePlan(currentUser, {
        title: 'General inspection',
        intervalDays: 30,
        nextDueDate: '2026-07-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists and returns preventive maintenance plans', async () => {
    const plan = createPreventivePlan();
    preventiveMaintenancePlansRepository.listPlans.mockResolvedValue([
      1,
      [plan],
    ]);
    preventiveMaintenancePlansRepository.findPlan.mockResolvedValue(plan);

    const result = await service.listPreventivePlans(currentUser, {
      page: 2,
      limit: 10,
      search: ' AC ',
      status: PreventiveMaintenanceStatus.ACTIVE,
      assetId: 4,
      roomId: 12,
      dueFrom: '2026-06-01',
      dueTo: '2026-09-30',
    });

    expect(preventiveMaintenancePlansRepository.listPlans).toHaveBeenCalledWith(
      {
        skip: 10,
        take: 10,
        search: 'AC',
        status: PreventiveMaintenanceStatus.ACTIVE,
        assetId: 4,
        roomId: 12,
        dueFrom: new Date('2026-06-01'),
        dueTo: new Date('2026-09-30'),
      },
    );
    expect(result.pagination.total).toBe(1);
    await expect(
      service.getPreventivePlanById(currentUser, 6),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 6,
        planNumber: 'PMP-20260604-123450',
      }),
    );
  });

  it('updates and soft-deletes a preventive maintenance plan', async () => {
    preventiveMaintenancePlansRepository.findPlan.mockResolvedValue(
      createPreventivePlan(),
    );
    preventiveMaintenancePlansRepository.updatePlan
      .mockResolvedValueOnce(
        createPreventivePlan({
          intervalDays: 60,
          status: PreventiveMaintenanceStatus.PAUSED,
        }),
      )
      .mockResolvedValueOnce(
        createPreventivePlan({
          status: PreventiveMaintenanceStatus.CANCELLED,
        }),
      );

    const updated = await service.updatePreventivePlan(currentUser, 6, {
      intervalDays: 60,
      status: PreventiveMaintenanceStatus.PAUSED,
    });
    const deleted = await service.deletePreventivePlan(currentUser, 6);

    expect(
      preventiveMaintenancePlansRepository.updatePlan,
    ).toHaveBeenCalledWith(6, {
      intervalDays: 60,
      status: PreventiveMaintenanceStatus.PAUSED,
    });
    expect(
      preventiveMaintenancePlansRepository.updatePlan,
    ).toHaveBeenCalledWith(6, {
      status: PreventiveMaintenanceStatus.CANCELLED,
    });
    expect(updated.status).toBe(PreventiveMaintenanceStatus.PAUSED);
    expect(deleted.status).toBe(PreventiveMaintenanceStatus.CANCELLED);
  });

  it('prevents updates that remove every preventive plan linkage', async () => {
    preventiveMaintenancePlansRepository.findPlan.mockResolvedValue(
      createPreventivePlan({
        assetId: 4,
        roomId: null,
        room: null,
      }),
    );

    await expect(
      service.updatePreventivePlan(currentUser, 6, {
        assetId: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a ticket from an active preventive plan and advances its due date', async () => {
    const plan = createPreventivePlan();
    const advancedPlan = createPreventivePlan({
      nextDueDate: new Date('2026-11-30T00:00:00.000Z'),
    });
    const ticket = createTicket({
      source: MaintenanceTicketSource.PREVENTIVE,
      sourceType: 'PREVENTIVE_PLAN',
      sourceId: plan.id,
      assetId: plan.assetId,
      roomId: plan.roomId,
      title: plan.title,
      description: plan.description,
    });
    preventiveMaintenancePlansRepository.findPlan.mockResolvedValue(plan);
    maintenanceTicketsRepository.findActiveTicketBySource.mockResolvedValue(
      null,
    );
    maintenanceTicketsRepository.findByTicketNumber.mockResolvedValue(null);
    maintenanceTicketsRepository.createTicket.mockResolvedValue(ticket);
    preventiveMaintenancePlansRepository.updatePlan.mockResolvedValue(
      advancedPlan,
    );

    const result = await service.createTicketFromPreventivePlan(
      currentUser,
      6,
      {
        issueType: MaintenanceIssueType.HVAC,
        priority: MaintenancePriority.NORMAL,
      },
    );

    expect(maintenanceTicketsRepository.runInTransaction).toHaveBeenCalled();
    expect(maintenanceTicketsRepository.createTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        source: MaintenanceTicketSource.PREVENTIVE,
        sourceType: 'PREVENTIVE_PLAN',
        sourceId: 6,
        assetId: 4,
        roomId: 12,
        title: plan.title,
      }),
      {},
    );
    expect(
      preventiveMaintenancePlansRepository.updatePlan,
    ).toHaveBeenCalledWith(
      6,
      {
        nextDueDate: new Date('2026-11-30T00:00:00.000Z'),
      },
      {},
    );
    expect(result.ticket.sourceType).toBe('PREVENTIVE_PLAN');
    expect(result.preventivePlan.nextDueDate).toEqual(
      new Date('2026-11-30T00:00:00.000Z'),
    );
  });

  it('rejects ticket creation for inactive or already-ticketed preventive plans', async () => {
    preventiveMaintenancePlansRepository.findPlan.mockResolvedValueOnce(
      createPreventivePlan({
        status: PreventiveMaintenanceStatus.PAUSED,
      }),
    );

    await expect(
      service.createTicketFromPreventivePlan(currentUser, 6, {}),
    ).rejects.toBeInstanceOf(ConflictException);

    preventiveMaintenancePlansRepository.findPlan.mockResolvedValueOnce(
      createPreventivePlan(),
    );
    maintenanceTicketsRepository.findActiveTicketBySource.mockResolvedValue(
      createTicket({
        source: MaintenanceTicketSource.PREVENTIVE,
        sourceType: 'PREVENTIVE_PLAN',
        sourceId: 6,
      }),
    );

    await expect(
      service.createTicketFromPreventivePlan(currentUser, 6, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects inactive rooms', async () => {
    roomsRepository.findRoom.mockResolvedValue(createRoom({ isActive: false }));

    await expect(
      service.createTicket(currentUser, {
        roomId: 12,
        title: 'AC leaking',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires linked assets to be active', async () => {
    roomsRepository.findRoom.mockResolvedValue(createRoom());
    assetsRepository.findActiveAsset.mockResolvedValue(null);

    await expect(
      service.createTicket(currentUser, {
        roomId: 12,
        assetId: 4,
        title: 'AC leaking',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires assigned user to be active', async () => {
    roomsRepository.findRoom.mockResolvedValue(createRoom());
    maintenanceTicketsRepository.findActiveUser.mockResolvedValue(null);

    await expect(
      service.createTicket(currentUser, {
        roomId: 12,
        assignedToUserId: 9,
        title: 'AC leaking',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists tickets with pagination and filters', async () => {
    const ticket = createTicket();
    maintenanceTicketsRepository.listTickets.mockResolvedValue([1, [ticket]]);

    const result = await service.listTickets(currentUser, {
      page: 2,
      limit: 10,
      search: ' AC ',
      status: MaintenanceTicketStatus.OPEN,
      priority: MaintenancePriority.NORMAL,
      issueType: MaintenanceIssueType.HVAC,
      roomId: 12,
      assetId: 4,
      assignedToUserId: 9,
      createdFrom: '2026-06-01',
      createdTo: '2026-06-30',
    });

    expect(maintenanceTicketsRepository.listTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        search: 'AC',
        status: MaintenanceTicketStatus.OPEN,
        priority: MaintenancePriority.NORMAL,
        issueType: MaintenanceIssueType.HVAC,
        roomId: 12,
        assetId: 4,
        assignedToUserId: 9,
        createdFrom: expect.any(Date),
        createdTo: expect.any(Date),
      }),
    );
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('lists tickets assigned to the current user', async () => {
    maintenanceTicketsRepository.listTickets.mockResolvedValue([0, []]);

    await service.listAssignedToMe(currentUser, {
      page: 1,
      limit: 20,
      assignedToUserId: 999,
    });

    expect(maintenanceTicketsRepository.listTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        assignedToUserId: currentUser.sub,
      }),
    );
  });

  it('returns ticket details', async () => {
    const ticket = createTicket();
    maintenanceTicketsRepository.findTicket.mockResolvedValue(ticket);

    await expect(service.getTicketById(currentUser, 30)).resolves.toEqual(
      expect.objectContaining({
        id: 30,
        ticketNumber: 'MNT-20260604-123450',
      }),
    );
    expect(maintenanceTicketsRepository.findTicket).toHaveBeenCalledWith(30);
  });

  it('throws when ticket details are missing', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(null);

    await expect(
      service.getTicketById(currentUser, 404),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('assigns a ticket to an active user', async () => {
    const ticket = createTicket();
    const assignedUser = createUser({ id: 9 });
    maintenanceTicketsRepository.findTicket.mockResolvedValue(ticket);
    maintenanceTicketsRepository.findActiveUser.mockResolvedValue(assignedUser);
    maintenanceTicketsRepository.updateTicket.mockResolvedValue(
      createTicket({
        assignedToUserId: 9,
        assignedByUserId: 1,
        assignedAt: now,
        status: MaintenanceTicketStatus.ASSIGNED,
        assignedTo: assignedUser,
        assignedBy: createUser({ id: 1 }),
      }),
    );

    const result = await service.assignTicket(currentUser, 30, {
      assignedToUserId: 9,
      notes: 'Assigning to HVAC technician.',
    });

    expect(maintenanceTicketsRepository.updateTicket).toHaveBeenCalledWith(30, {
      assignedToUserId: 9,
      assignedByUserId: 1,
      assignedAt: expect.any(Date),
      status: MaintenanceTicketStatus.ASSIGNED,
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.tickets.assigned',
        entityType: 'MaintenanceTicket',
        entityId: '30',
      }),
    );
    expect(result.assignedToUserId).toBe(9);
  });

  it('keeps an in-progress ticket in progress when reassigned', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.IN_PROGRESS,
      }),
    );
    maintenanceTicketsRepository.findActiveUser.mockResolvedValue(createUser());
    maintenanceTicketsRepository.updateTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.IN_PROGRESS,
        assignedToUserId: 9,
      }),
    );

    await service.assignTicket(currentUser, 30, {
      assignedToUserId: 9,
    });

    expect(maintenanceTicketsRepository.updateTicket).toHaveBeenCalledWith(
      30,
      expect.objectContaining({
        status: MaintenanceTicketStatus.IN_PROGRESS,
      }),
    );
  });

  it('rejects assignment for approved or cancelled tickets', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.APPROVED,
      }),
    );
    maintenanceTicketsRepository.findActiveUser.mockResolvedValue(createUser());

    await expect(
      service.assignTicket(currentUser, 30, {
        assignedToUserId: 9,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates editable ticket details', async () => {
    const ticket = createTicket({
      assignedToUserId: 9,
    });
    maintenanceTicketsRepository.findTicket.mockResolvedValue(ticket);
    roomsRepository.findRoom.mockResolvedValue(createRoom({ id: 13 }));
    assetsRepository.findActiveAsset.mockResolvedValue(createAsset({ id: 5 }));
    maintenanceTicketsRepository.updateTicket.mockResolvedValue(
      createTicket({
        roomId: 13,
        assetId: 5,
        priority: MaintenancePriority.HIGH,
        title: 'Updated AC leak',
      }),
    );

    const result = await service.updateTicket(
      currentUser,
      ['maintenance.tickets.update'],
      30,
      {
        roomId: 13,
        assetId: 5,
        priority: MaintenancePriority.HIGH,
        title: ' Updated AC leak ',
      },
    );

    expect(maintenanceTicketsRepository.updateTicket).toHaveBeenCalledWith(30, {
      roomId: 13,
      assetId: 5,
      priority: MaintenancePriority.HIGH,
      title: 'Updated AC leak',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.tickets.updated',
        entityType: 'MaintenanceTicket',
      }),
    );
    expect(result.priority).toBe(MaintenancePriority.HIGH);
  });

  it('rejects assigned-only updates for unassigned users', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        assignedToUserId: 9,
      }),
    );

    await expect(
      service.updateTicket(
        currentUser,
        ['maintenance.tickets.update.assigned'],
        30,
        {
          priority: MaintenancePriority.HIGH,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects unsafe updates for approved tickets', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.APPROVED,
      }),
    );

    await expect(
      service.updateTicket(currentUser, ['maintenance.tickets.update'], 30, {
        priority: MaintenancePriority.HIGH,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('starts an assigned ticket and can mark the room under maintenance', async () => {
    const assignedTicket = createTicket({
      status: MaintenanceTicketStatus.ASSIGNED,
      assignedToUserId: currentUser.sub,
      room: createRoom({
        maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      }),
    });
    maintenanceTicketsRepository.findTicket.mockResolvedValue(assignedTicket);
    maintenanceTicketsRepository.updateTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.IN_PROGRESS,
        assignedToUserId: currentUser.sub,
        startedAt: now,
      }),
    );

    const result = await service.startTicket(
      currentUser,
      ['maintenance.tickets.start.assigned'],
      30,
      {
        notes: 'Starting work.',
        markRoomUnderMaintenance: true,
      },
    );

    expect(maintenanceTicketsRepository.runInTransaction).toHaveBeenCalled();
    expect(maintenanceTicketsRepository.updateTicket).toHaveBeenCalledWith(
      30,
      {
        status: MaintenanceTicketStatus.IN_PROGRESS,
        startedAt: expect.any(Date),
      },
      {},
    );
    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(
      12,
      {
        maintenanceStatus: RoomMaintenanceStatus.UNDER_MAINTENANCE,
      },
      {},
    );
    expect(roomsRepository.createStatusLogs).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          roomId: 12,
          field: 'maintenanceStatus',
          oldValue: RoomMaintenanceStatus.AVAILABLE,
          newValue: RoomMaintenanceStatus.UNDER_MAINTENANCE,
        }),
      ],
      {},
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.tickets.started',
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.rooms.marked_under_maintenance',
        entityType: 'Room',
        entityId: '12',
      }),
    );
    expect(result.status).toBe(MaintenanceTicketStatus.IN_PROGRESS);
  });

  it('rejects assigned-only start for unassigned users', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.ASSIGNED,
        assignedToUserId: 9,
      }),
    );

    await expect(
      service.startTicket(
        currentUser,
        ['maintenance.tickets.start.assigned'],
        30,
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects start from invalid ticket status', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.COMPLETED,
      }),
    );

    await expect(
      service.startTicket(currentUser, ['maintenance.tickets.start'], 30, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('completes assigned or in-progress tickets', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.IN_PROGRESS,
        assignedToUserId: currentUser.sub,
      }),
    );
    maintenanceTicketsRepository.updateTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.COMPLETED,
        assignedToUserId: currentUser.sub,
        completedAt: now,
        completedByUserId: currentUser.sub,
        completionNotes: 'Done.',
      }),
    );

    const result = await service.completeTicket(
      currentUser,
      ['maintenance.tickets.complete.assigned'],
      30,
      {
        completionNotes: ' Done. ',
      },
    );

    expect(maintenanceTicketsRepository.updateTicket).toHaveBeenCalledWith(30, {
      status: MaintenanceTicketStatus.COMPLETED,
      completedAt: expect.any(Date),
      completedByUserId: currentUser.sub,
      completionNotes: 'Done.',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.tickets.completed',
      }),
    );
    expect(result.status).toBe(MaintenanceTicketStatus.COMPLETED);
  });

  it('rejects complete from invalid ticket status', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.OPEN,
      }),
    );

    await expect(
      service.completeTicket(
        currentUser,
        ['maintenance.tickets.complete'],
        30,
        {},
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('approves a completed ticket and can clear room maintenance', async () => {
    const completedTicket = createTicket({
      status: MaintenanceTicketStatus.COMPLETED,
      room: createRoom({
        maintenanceStatus: RoomMaintenanceStatus.UNDER_MAINTENANCE,
      }),
    });
    maintenanceTicketsRepository.findTicket.mockResolvedValue(completedTicket);
    maintenanceTicketsRepository.updateTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.APPROVED,
        approvedAt: now,
        approvedByUserId: currentUser.sub,
        approvalNotes: 'Verified.',
      }),
    );

    const result = await service.approveTicket(currentUser, 30, {
      approvalNotes: ' Verified. ',
      clearMaintenance: true,
    });

    expect(maintenanceTicketsRepository.runInTransaction).toHaveBeenCalled();
    expect(maintenanceTicketsRepository.updateTicket).toHaveBeenCalledWith(
      30,
      {
        status: MaintenanceTicketStatus.APPROVED,
        approvedAt: expect.any(Date),
        approvedByUserId: currentUser.sub,
        approvalNotes: 'Verified.',
      },
      {},
    );
    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(
      12,
      {
        maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      },
      {},
    );
    expect(roomsRepository.createStatusLogs).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          roomId: 12,
          field: 'maintenanceStatus',
          oldValue: RoomMaintenanceStatus.UNDER_MAINTENANCE,
          newValue: RoomMaintenanceStatus.AVAILABLE,
        }),
      ],
      {},
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.tickets.approved',
      }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.rooms.maintenance_cleared',
        entityType: 'Room',
        entityId: '12',
      }),
    );
    expect(result.status).toBe(MaintenanceTicketStatus.APPROVED);
  });

  it('rejects approval for tickets that are not completed', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.IN_PROGRESS,
      }),
    );

    await expect(
      service.approveTicket(currentUser, 30, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a completed ticket with a required reason', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.COMPLETED,
      }),
    );
    maintenanceTicketsRepository.updateTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.REJECTED,
        rejectedAt: now,
        rejectedByUserId: currentUser.sub,
        rejectionReason: 'Still leaking.',
      }),
    );

    const result = await service.rejectTicket(currentUser, 30, {
      rejectionReason: ' Still leaking. ',
      notes: 'Retest after repair.',
    });

    expect(maintenanceTicketsRepository.updateTicket).toHaveBeenCalledWith(30, {
      status: MaintenanceTicketStatus.REJECTED,
      rejectedAt: expect.any(Date),
      rejectedByUserId: currentUser.sub,
      rejectionReason: 'Still leaking.',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.tickets.rejected',
      }),
    );
    expect(result.status).toBe(MaintenanceTicketStatus.REJECTED);
  });

  it('requires a rejection reason', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.COMPLETED,
      }),
    );

    await expect(
      service.rejectTicket(currentUser, 30, {
        rejectionReason: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancels a ticket with a required reason', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(createTicket());
    maintenanceTicketsRepository.updateTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.CANCELLED,
        cancelledAt: now,
        cancelledByUserId: currentUser.sub,
        cancellationReason: 'Duplicate.',
      }),
    );

    const result = await service.cancelTicket(currentUser, 30, {
      reason: ' Duplicate. ',
    });

    expect(maintenanceTicketsRepository.updateTicket).toHaveBeenCalledWith(30, {
      status: MaintenanceTicketStatus.CANCELLED,
      cancelledAt: expect.any(Date),
      cancelledByUserId: currentUser.sub,
      cancellationReason: 'Duplicate.',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.tickets.cancelled',
      }),
    );
    expect(result.status).toBe(MaintenanceTicketStatus.CANCELLED);
  });

  it('does not cancel approved tickets', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        status: MaintenanceTicketStatus.APPROVED,
      }),
    );

    await expect(
      service.cancelTicket(currentUser, 30, {
        reason: 'Duplicate.',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires a cancellation reason', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(createTicket());

    await expect(
      service.cancelTicket(currentUser, 30, {
        reason: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks a room out of order and records status log plus audit', async () => {
    roomsRepository.findRoom.mockResolvedValue(createRoom());
    roomsRepository.updateRoom.mockResolvedValue(
      createRoom({
        maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
      }),
    );

    const result = await service.markRoomOutOfOrder(currentUser, 12, {
      reason: ' Water leak. ',
    });

    expect(maintenanceTicketsRepository.runInTransaction).toHaveBeenCalled();
    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(
      12,
      {
        maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
      },
      {},
    );
    expect(roomsRepository.createStatusLogs).toHaveBeenCalledWith(
      [
        {
          roomId: 12,
          actorUserId: currentUser.sub,
          field: 'maintenanceStatus',
          oldValue: RoomMaintenanceStatus.AVAILABLE,
          newValue: RoomMaintenanceStatus.OUT_OF_ORDER,
          reason: 'Water leak.',
        },
      ],
      {},
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.rooms.marked_out_of_order',
        entityType: 'Room',
        entityId: '12',
      }),
    );
    expect(result.maintenanceStatus).toBe(RoomMaintenanceStatus.OUT_OF_ORDER);
  });

  it('marks a room under maintenance', async () => {
    roomsRepository.findRoom.mockResolvedValue(createRoom());
    roomsRepository.updateRoom.mockResolvedValue(
      createRoom({
        maintenanceStatus: RoomMaintenanceStatus.UNDER_MAINTENANCE,
      }),
    );

    const result = await service.markRoomUnderMaintenance(currentUser, 12, {
      reason: 'Technician working.',
    });

    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(
      12,
      {
        maintenanceStatus: RoomMaintenanceStatus.UNDER_MAINTENANCE,
      },
      {},
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.rooms.marked_under_maintenance',
      }),
    );
    expect(result.maintenanceStatus).toBe(
      RoomMaintenanceStatus.UNDER_MAINTENANCE,
    );
  });

  it('clears room maintenance status', async () => {
    roomsRepository.findRoom.mockResolvedValue(
      createRoom({
        maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
      }),
    );
    roomsRepository.updateRoom.mockResolvedValue(
      createRoom({
        maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      }),
    );

    const result = await service.clearRoomMaintenance(currentUser, 12, {
      reason: 'Repair completed.',
    });

    expect(roomsRepository.updateRoom).toHaveBeenCalledWith(
      12,
      {
        maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      },
      {},
    );
    expect(roomsRepository.createStatusLogs).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          oldValue: RoomMaintenanceStatus.OUT_OF_ORDER,
          newValue: RoomMaintenanceStatus.AVAILABLE,
        }),
      ],
      {},
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.rooms.maintenance_cleared',
      }),
    );
    expect(result.maintenanceStatus).toBe(RoomMaintenanceStatus.AVAILABLE);
  });

  it('does not create status log when room already has requested maintenance status', async () => {
    roomsRepository.findRoom.mockResolvedValue(
      createRoom({
        maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
      }),
    );

    const result = await service.markRoomOutOfOrder(currentUser, 12, {});

    expect(roomsRepository.updateRoom).not.toHaveBeenCalled();
    expect(roomsRepository.createStatusLogs).not.toHaveBeenCalled();
    expect(auditLogsService.record).not.toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.rooms.marked_out_of_order',
      }),
    );
    expect(result.maintenanceStatus).toBe(RoomMaintenanceStatus.OUT_OF_ORDER);
  });

  it('rejects room maintenance changes for inactive rooms', async () => {
    roomsRepository.findRoom.mockResolvedValue(createRoom({ isActive: false }));

    await expect(
      service.markRoomUnderMaintenance(currentUser, 12, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('adds a note to an assigned maintenance ticket', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        assignedToUserId: currentUser.sub,
      }),
    );
    maintenanceTicketNotesRepository.createNote.mockResolvedValue({
      id: 71,
      ticketId: 30,
      authorUserId: currentUser.sub,
      note: 'Pump is blocked.',
      createdAt: now,
      author: createUser({ id: currentUser.sub }),
    });

    const result = await service.addTicketNote(
      currentUser,
      ['maintenance.tickets.update.assigned'],
      30,
      {
        note: ' Pump is blocked. ',
      },
    );

    expect(maintenanceTicketNotesRepository.createNote).toHaveBeenCalledWith({
      ticketId: 30,
      authorUserId: currentUser.sub,
      note: 'Pump is blocked.',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.tickets.note_added',
        entityType: 'MaintenanceTicketNote',
        entityId: '71',
      }),
    );
    expect(result.note).toBe('Pump is blocked.');
  });

  it('rejects assigned-only notes for unassigned users', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        assignedToUserId: 9,
      }),
    );

    await expect(
      service.addTicketNote(
        currentUser,
        ['maintenance.tickets.update.assigned'],
        30,
        {
          note: 'Diagnostic note.',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('adds a photo to an assigned maintenance ticket', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        assignedToUserId: currentUser.sub,
      }),
    );
    maintenanceTicketPhotosRepository.createPhoto.mockResolvedValue({
      id: 81,
      ticketId: 30,
      uploadedByUserId: currentUser.sub,
      url: 'https://files.example.com/leak.jpg',
      description: 'Leak below the AC.',
      createdAt: now,
      uploadedBy: createUser({ id: currentUser.sub }),
    });

    const result = await service.addTicketPhoto(
      currentUser,
      ['maintenance.photos.upload', 'maintenance.tickets.update.assigned'],
      30,
      {
        url: 'https://files.example.com/leak.jpg',
        description: ' Leak below the AC. ',
      },
    );

    expect(maintenanceTicketPhotosRepository.createPhoto).toHaveBeenCalledWith({
      ticketId: 30,
      uploadedByUserId: currentUser.sub,
      url: 'https://files.example.com/leak.jpg',
      description: 'Leak below the AC.',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'maintenance.tickets.photo_added',
        entityType: 'MaintenanceTicketPhoto',
        entityId: '81',
      }),
    );
    expect(result.url).toBe('https://files.example.com/leak.jpg');
  });

  it('rejects assigned-only photos for unassigned users', async () => {
    maintenanceTicketsRepository.findTicket.mockResolvedValue(
      createTicket({
        assignedToUserId: 9,
      }),
    );

    await expect(
      service.addTicketPhoto(
        currentUser,
        ['maintenance.photos.upload', 'maintenance.tickets.update.assigned'],
        30,
        {
          url: 'https://files.example.com/leak.jpg',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
