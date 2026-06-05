import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import {
  ANY_REQUIRED_PERMISSIONS_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

describe('MaintenanceController', () => {
  let controller: MaintenanceController;
  let maintenanceService: {
    createTicket: jest.Mock;
    listTickets: jest.Mock;
    listAssignedToMe: jest.Mock;
    getTicketById: jest.Mock;
    assignTicket: jest.Mock;
    updateTicket: jest.Mock;
    startTicket: jest.Mock;
    completeTicket: jest.Mock;
    approveTicket: jest.Mock;
    rejectTicket: jest.Mock;
    cancelTicket: jest.Mock;
    markRoomOutOfOrder: jest.Mock;
    markRoomUnderMaintenance: jest.Mock;
    clearRoomMaintenance: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'supervisor@demo-hotel.com',
    roleKey: 'MAINTENANCE_SUPERVISOR',
    roleId: 8,
    departmentId: 4,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    maintenanceService = {
      createTicket: jest.fn(),
      listTickets: jest.fn(),
      listAssignedToMe: jest.fn(),
      getTicketById: jest.fn(),
      assignTicket: jest.fn(),
      updateTicket: jest.fn(),
      startTicket: jest.fn(),
      completeTicket: jest.fn(),
      approveTicket: jest.fn(),
      rejectTicket: jest.fn(),
      cancelTicket: jest.fn(),
      markRoomOutOfOrder: jest.fn(),
      markRoomUnderMaintenance: jest.fn(),
      clearRoomMaintenance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceController],
      providers: [
        {
          provide: MaintenanceService,
          useValue: maintenanceService,
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

    controller = module.get<MaintenanceController>(MaintenanceController);
  });

  it('protects maintenance routes with auth and permission guards', () => {
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, MaintenanceController) ?? [];

    expect(guards).toEqual([JwtAuthGuard, PermissionsGuard]);
  });

  it('declares required permissions for ticket routes', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        MaintenanceController.prototype.createTicket,
      ),
    ).toEqual(['maintenance.tickets.create']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        MaintenanceController.prototype.listTickets,
      ),
    ).toEqual(['maintenance.tickets.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        MaintenanceController.prototype.getTicketById,
      ),
    ).toEqual(['maintenance.tickets.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        MaintenanceController.prototype.assignTicket,
      ),
    ).toEqual(['maintenance.tickets.assign']);
    expect(
      Reflect.getMetadata(
        ANY_REQUIRED_PERMISSIONS_KEY,
        MaintenanceController.prototype.listAssignedToMe,
      ),
    ).toEqual([
      'maintenance.tickets.read',
      'maintenance.tickets.read.assigned',
    ]);
    expect(
      Reflect.getMetadata(
        ANY_REQUIRED_PERMISSIONS_KEY,
        MaintenanceController.prototype.updateTicket,
      ),
    ).toEqual([
      'maintenance.tickets.update',
      'maintenance.tickets.update.assigned',
    ]);
    expect(
      Reflect.getMetadata(
        ANY_REQUIRED_PERMISSIONS_KEY,
        MaintenanceController.prototype.startTicket,
      ),
    ).toEqual([
      'maintenance.tickets.start',
      'maintenance.tickets.start.assigned',
    ]);
    expect(
      Reflect.getMetadata(
        ANY_REQUIRED_PERMISSIONS_KEY,
        MaintenanceController.prototype.completeTicket,
      ),
    ).toEqual([
      'maintenance.tickets.complete',
      'maintenance.tickets.complete.assigned',
    ]);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        MaintenanceController.prototype.approveTicket,
      ),
    ).toEqual(['maintenance.tickets.approve']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        MaintenanceController.prototype.rejectTicket,
      ),
    ).toEqual(['maintenance.tickets.approve']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        MaintenanceController.prototype.cancelTicket,
      ),
    ).toEqual(['maintenance.tickets.update']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        MaintenanceController.prototype.markRoomOutOfOrder,
      ),
    ).toEqual(['rooms.out_of_order.mark']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        MaintenanceController.prototype.markRoomUnderMaintenance,
      ),
    ).toEqual(['rooms.out_of_order.mark']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        MaintenanceController.prototype.clearRoomMaintenance,
      ),
    ).toEqual(['rooms.out_of_order.clear']);
  });

  it('delegates ticket creation to the service', async () => {
    const dto = {
      roomId: 12,
      title: 'AC leaking',
    };
    const response = {
      id: 1,
      ticketNumber: 'MNT-20260604-123450',
    };
    maintenanceService.createTicket.mockResolvedValue(response);

    await expect(controller.createTicket(currentUser, dto)).resolves.toBe(
      response,
    );
    expect(maintenanceService.createTicket).toHaveBeenCalledWith(
      currentUser,
      dto,
    );
  });

  it('delegates ticket listing to the service', async () => {
    const query = {
      page: 1,
      limit: 20,
    };
    const response = {
      items: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
    maintenanceService.listTickets.mockResolvedValue(response);

    await expect(controller.listTickets(currentUser, query)).resolves.toBe(
      response,
    );
    expect(maintenanceService.listTickets).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates ticket detail lookup to the service', async () => {
    const response = {
      id: 1,
      ticketNumber: 'MNT-20260604-123450',
    };
    maintenanceService.getTicketById.mockResolvedValue(response);

    await expect(controller.getTicketById(currentUser, 1)).resolves.toBe(
      response,
    );
    expect(maintenanceService.getTicketById).toHaveBeenCalledWith(
      currentUser,
      1,
    );
  });

  it('delegates assigned ticket listing to the service', async () => {
    const query = {
      page: 1,
      limit: 20,
    };
    const response = {
      items: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
    maintenanceService.listAssignedToMe.mockResolvedValue(response);

    await expect(controller.listAssignedToMe(currentUser, query)).resolves.toBe(
      response,
    );
    expect(maintenanceService.listAssignedToMe).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates ticket assignment to the service', async () => {
    const dto = {
      assignedToUserId: 9,
    };
    const response = {
      id: 1,
      assignedToUserId: 9,
    };
    maintenanceService.assignTicket.mockResolvedValue(response);

    await expect(controller.assignTicket(currentUser, 1, dto)).resolves.toBe(
      response,
    );
    expect(maintenanceService.assignTicket).toHaveBeenCalledWith(
      currentUser,
      1,
      dto,
    );
  });

  it('delegates ticket updates to the service', async () => {
    const dto = {
      priority: 'HIGH' as const,
    };
    const response = {
      id: 1,
      priority: 'HIGH',
    };
    const permissionKeys = ['maintenance.tickets.update'];
    maintenanceService.updateTicket.mockResolvedValue(response);

    await expect(
      controller.updateTicket(currentUser, permissionKeys, 1, dto),
    ).resolves.toBe(response);
    expect(maintenanceService.updateTicket).toHaveBeenCalledWith(
      currentUser,
      permissionKeys,
      1,
      dto,
    );
  });

  it('delegates ticket start to the service', async () => {
    const dto = {
      markRoomUnderMaintenance: true,
    };
    const response = {
      id: 1,
      status: 'IN_PROGRESS',
    };
    const permissionKeys = ['maintenance.tickets.start.assigned'];
    maintenanceService.startTicket.mockResolvedValue(response);

    await expect(
      controller.startTicket(currentUser, permissionKeys, 1, dto),
    ).resolves.toBe(response);
    expect(maintenanceService.startTicket).toHaveBeenCalledWith(
      currentUser,
      permissionKeys,
      1,
      dto,
    );
  });

  it('delegates ticket completion to the service', async () => {
    const dto = {
      completionNotes: 'Drain line cleaned.',
    };
    const response = {
      id: 1,
      status: 'COMPLETED',
    };
    const permissionKeys = ['maintenance.tickets.complete.assigned'];
    maintenanceService.completeTicket.mockResolvedValue(response);

    await expect(
      controller.completeTicket(currentUser, permissionKeys, 1, dto),
    ).resolves.toBe(response);
    expect(maintenanceService.completeTicket).toHaveBeenCalledWith(
      currentUser,
      permissionKeys,
      1,
      dto,
    );
  });

  it('delegates ticket approval to the service', async () => {
    const dto = {
      clearMaintenance: true,
    };
    const response = {
      id: 1,
      status: 'APPROVED',
    };
    maintenanceService.approveTicket.mockResolvedValue(response);

    await expect(controller.approveTicket(currentUser, 1, dto)).resolves.toBe(
      response,
    );
    expect(maintenanceService.approveTicket).toHaveBeenCalledWith(
      currentUser,
      1,
      dto,
    );
  });

  it('delegates ticket rejection to the service', async () => {
    const dto = {
      rejectionReason: 'Repair still fails inspection.',
    };
    const response = {
      id: 1,
      status: 'REJECTED',
    };
    maintenanceService.rejectTicket.mockResolvedValue(response);

    await expect(controller.rejectTicket(currentUser, 1, dto)).resolves.toBe(
      response,
    );
    expect(maintenanceService.rejectTicket).toHaveBeenCalledWith(
      currentUser,
      1,
      dto,
    );
  });

  it('delegates ticket cancellation to the service', async () => {
    const dto = {
      reason: 'Duplicate ticket.',
    };
    const response = {
      id: 1,
      status: 'CANCELLED',
    };
    maintenanceService.cancelTicket.mockResolvedValue(response);

    await expect(controller.cancelTicket(currentUser, 1, dto)).resolves.toBe(
      response,
    );
    expect(maintenanceService.cancelTicket).toHaveBeenCalledWith(
      currentUser,
      1,
      dto,
    );
  });

  it('delegates room out-of-order marking to the service', async () => {
    const dto = {
      reason: 'Water leak.',
    };
    const response = {
      id: 12,
      maintenanceStatus: 'OUT_OF_ORDER',
    };
    maintenanceService.markRoomOutOfOrder.mockResolvedValue(response);

    await expect(
      controller.markRoomOutOfOrder(currentUser, 12, dto),
    ).resolves.toBe(response);
    expect(maintenanceService.markRoomOutOfOrder).toHaveBeenCalledWith(
      currentUser,
      12,
      dto,
    );
  });

  it('delegates room under-maintenance marking to the service', async () => {
    const dto = {
      reason: 'Technician working.',
    };
    const response = {
      id: 12,
      maintenanceStatus: 'UNDER_MAINTENANCE',
    };
    maintenanceService.markRoomUnderMaintenance.mockResolvedValue(response);

    await expect(
      controller.markRoomUnderMaintenance(currentUser, 12, dto),
    ).resolves.toBe(response);
    expect(maintenanceService.markRoomUnderMaintenance).toHaveBeenCalledWith(
      currentUser,
      12,
      dto,
    );
  });

  it('delegates room maintenance clearing to the service', async () => {
    const dto = {
      reason: 'Repair completed.',
    };
    const response = {
      id: 12,
      maintenanceStatus: 'AVAILABLE',
    };
    maintenanceService.clearRoomMaintenance.mockResolvedValue(response);

    await expect(
      controller.clearRoomMaintenance(currentUser, 12, dto),
    ).resolves.toBe(response);
    expect(maintenanceService.clearRoomMaintenance).toHaveBeenCalledWith(
      currentUser,
      12,
      dto,
    );
  });
});
