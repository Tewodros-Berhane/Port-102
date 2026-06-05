import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  AssetStatus,
  MaintenanceIssueType,
  MaintenancePriority,
  MaintenanceTicketSource,
  MaintenanceTicketStatus,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
  UserStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RoomsRepository } from '../rooms/repositories/rooms.repository';
import { MaintenanceService } from './maintenance.service';
import { AssetsRepository } from './repositories/assets.repository';
import { MaintenanceTicketsRepository } from './repositories/maintenance-tickets.repository';

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
  };
  let assetsRepository: {
    findActiveAsset: jest.Mock;
  };
  let roomsRepository: {
    findRoom: jest.Mock;
    updateRoom: jest.Mock;
    createStatusLogs: jest.Mock;
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
    };
    assetsRepository = {
      findActiveAsset: jest.fn(),
    };
    roomsRepository = {
      findRoom: jest.fn(),
      updateRoom: jest.fn(),
      createStatusLogs: jest.fn(),
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

    await expect(service.getTicketById(currentUser, 404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
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

});
