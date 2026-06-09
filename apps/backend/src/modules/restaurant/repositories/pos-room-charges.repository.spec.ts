/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test } from '@nestjs/testing';

import { FolioLineItemType, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PosRoomChargesRepository } from './pos-room-charges.repository';

describe('PosRoomChargesRepository', () => {
  let repository: PosRoomChargesRepository;
  const prisma = {
    stay: { findUnique: jest.fn() },
    folioLineItem: { findFirst: jest.fn(), create: jest.fn() },
    folio: { update: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        PosRoomChargesRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    repository = module.get(PosRoomChargesRepository);
  });

  it('finds an active room assignment and open-folio projection for a stay', async () => {
    await repository.findStay(42);

    expect(prisma.stay.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42 },
        select: expect.objectContaining({
          folio: expect.any(Object),
          roomAssignments: expect.objectContaining({ take: 1 }),
        }),
      }),
    );
  });

  it('detects an existing non-voided POS folio charge', async () => {
    await repository.findOrderCharge(9);

    expect(prisma.folioLineItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type: FolioLineItemType.POS_CHARGE,
          sourceType: 'POS_ORDER',
          sourceId: 9,
          isVoided: false,
        },
      }),
    );
  });

  it('increments folio charge totals', async () => {
    const amount = new Prisma.Decimal(900);
    await repository.incrementFolio(7, amount);

    expect(prisma.folio.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: {
          subtotalAmount: { increment: amount },
          totalAmount: { increment: amount },
          balanceAmount: { increment: amount },
        },
      }),
    );
  });
});
