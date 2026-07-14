import {
  MaintenancePriority,
  MaintenanceTicketStatus,
  PaymentMethod,
} from '../../../generated/prisma/client';
import { FinancialReportRepository } from './financial-report.repository';
import { OperationsReportRepository } from './operations-report.repository';
import { RoomReportRepository } from './room-report.repository';
import { SupplyChainReportRepository } from './supply-chain-report.repository';

describe('Report repositories', () => {
  const from = new Date('2026-07-01T00:00:00.000Z');
  const to = new Date('2026-07-31T23:59:59.999Z');

  it('applies active-room filters in the room repository', async () => {
    const prisma = { room: { findMany: jest.fn().mockResolvedValue([]) } };
    await new RoomReportRepository(prisma as never).listRooms({ floorId: 2 });
    expect(prisma.room.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true, floorId: 2 } }),
    );
  });

  it('applies date, void, and method constraints in the financial repository', async () => {
    const prisma = {
      folioLineItem: { findMany: jest.fn().mockResolvedValue([]) },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const repository = new FinancialReportRepository(prisma as never);
    await repository.listFolioLineItems(from, to);
    await repository.listFolioPayments(from, to, PaymentMethod.CASH);
    expect(prisma.folioLineItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { postedAt: { gte: from, lte: to }, isVoided: false },
      }),
    );
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          recordedAt: { gte: from, lte: to },
          method: PaymentMethod.CASH,
        },
      }),
    );
  });

  it('limits urgent operational exceptions to unresolved tickets', async () => {
    const prisma = {
      maintenanceTicket: { findMany: jest.fn().mockResolvedValue([]) },
    };
    await new OperationsReportRepository(
      prisma as never,
    ).listUrgentMaintenanceTickets();
    expect(prisma.maintenanceTicket.findMany).toHaveBeenCalledWith({
      where: {
        priority: MaintenancePriority.URGENT,
        status: {
          notIn: [
            MaintenanceTicketStatus.APPROVED,
            MaintenanceTicketStatus.CANCELLED,
          ],
        },
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        roomId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  });

  it('scopes inventory movements to either side of a location transfer', async () => {
    const prisma = {
      stockMovement: { findMany: jest.fn().mockResolvedValue([]) },
    };
    await new SupplyChainReportRepository(prisma as never).listMovements(
      from,
      to,
      9,
    );
    expect(prisma.stockMovement.findMany).toHaveBeenCalledWith({
      where: {
        createdAt: { gte: from, lte: to },
        OR: [{ locationId: 9 }, { fromLocationId: 9 }, { toLocationId: 9 }],
      },
      select: { itemId: true, type: true, quantity: true, createdAt: true },
    });
  });
});
