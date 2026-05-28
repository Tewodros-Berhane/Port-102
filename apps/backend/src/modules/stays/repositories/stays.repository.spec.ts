import { StayStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StaysRepository } from './stays.repository';

describe('StaysRepository', () => {
  const stay = {
    create: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };
  const prisma = {
    stay,
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  let repository: StaysRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new StaysRepository(prisma);
  });

  it('creates a stay with the standard projection', async () => {
    const payload = {
      stayNumber: 'STAY-20260610-0001',
      reservationId: 1,
      guestId: 2,
      expectedCheckOutDate: new Date('2026-06-12T00:00:00.000Z'),
    };

    await repository.createStay(payload);

    expect(stay.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: payload,
        select: expect.objectContaining({
          id: true,
          stayNumber: true,
          roomAssignments: expect.any(Object),
        }),
      }),
    );
  });

  it('finds one stay by reservation id', async () => {
    await repository.findStayByReservationId(10);

    expect(stay.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          reservationId: 10,
        },
      }),
    );
  });

  it('lists stays with filters and pagination', async () => {
    stay.count.mockResolvedValue(1);
    stay.findMany.mockResolvedValue([]);

    await repository.listStays({
      skip: 20,
      take: 10,
      search: 'Aster',
      status: StayStatus.ACTIVE,
      guestId: 3,
      checkedInFrom: new Date('2026-06-01T00:00:00.000Z'),
      checkedInTo: new Date('2026-06-30T00:00:00.000Z'),
      expectedCheckOutFrom: new Date('2026-06-02T00:00:00.000Z'),
      expectedCheckOutTo: new Date('2026-07-01T00:00:00.000Z'),
    });

    expect(stay.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: StayStatus.ACTIVE,
        guestId: 3,
        checkedInAt: {
          gte: new Date('2026-06-01T00:00:00.000Z'),
          lte: new Date('2026-06-30T00:00:00.000Z'),
        },
        expectedCheckOutDate: {
          gte: new Date('2026-06-02T00:00:00.000Z'),
          lte: new Date('2026-07-01T00:00:00.000Z'),
        },
      }),
    });
    expect(stay.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      }),
    );
  });

  it('runs transactional stay operations through Prisma', async () => {
    const operation = jest.fn().mockResolvedValue('done');
    prisma.$transaction = jest.fn().mockResolvedValue('done');

    await expect(repository.runInTransaction(operation)).resolves.toBe('done');
    expect(prisma.$transaction).toHaveBeenCalledWith(operation);
  });
});
