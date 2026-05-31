import { FolioStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { FoliosRepository } from './folios.repository';

describe('FoliosRepository', () => {
  let repository: FoliosRepository;
  let prisma: {
    $transaction: jest.Mock;
    folio: {
      create: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    stay: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      folio: {
        create: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      stay: {
        findUnique: jest.fn(),
      },
    };

    repository = new FoliosRepository(prisma as unknown as PrismaService);
  });

  it('runs folio work inside a Prisma transaction', async () => {
    const operation = jest.fn();

    await repository.runInTransaction(operation);

    expect(prisma.$transaction).toHaveBeenCalledWith(operation);
  });

  it('creates folios with the standard projection', async () => {
    await repository.createFolio({
      folioNumber: 'FOL-20260530-000001',
      stayId: 10,
      guestId: 20,
      openedByUserId: 1,
    });

    expect(prisma.folio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          folioNumber: 'FOL-20260530-000001',
          stayId: 10,
          guestId: 20,
          openedByUserId: 1,
        },
        select: expect.objectContaining({
          id: true,
          folioNumber: true,
          stay: expect.any(Object),
          guest: expect.any(Object),
        }),
      }),
    );
  });

  it('finds one folio by stay id', async () => {
    await repository.findByStayId(10);

    expect(prisma.folio.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          stayId: 10,
        },
      }),
    );
  });

  it('finds the stay data needed to open a folio', async () => {
    await repository.findStayForFolio(10);

    expect(prisma.stay.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 10,
        },
        select: expect.objectContaining({
          id: true,
          stayNumber: true,
          guest: expect.any(Object),
        }),
      }),
    );
  });

  it('lists folios with filters, pagination, search, and stable ordering', async () => {
    prisma.folio.count.mockResolvedValue(0);
    prisma.folio.findMany.mockResolvedValue([]);

    await repository.listFolios({
      skip: 20,
      take: 10,
      search: 'aster',
      status: FolioStatus.OPEN,
      stayId: 10,
      guestId: 20,
      openedFrom: new Date('2026-05-01T00:00:00.000Z'),
      openedTo: new Date('2026-05-31T23:59:59.000Z'),
    });

    expect(prisma.folio.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: FolioStatus.OPEN,
        stayId: 10,
        guestId: 20,
        openedAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.000Z'),
        },
        OR: expect.any(Array),
      }),
    });
    expect(prisma.folio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
        orderBy: [{ openedAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });
});
