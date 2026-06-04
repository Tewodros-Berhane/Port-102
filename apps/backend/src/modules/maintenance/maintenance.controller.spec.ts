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
});
