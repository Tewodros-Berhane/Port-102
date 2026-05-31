import { FolioLineItemType } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { FolioLineItemsRepository } from './folio-line-items.repository';

describe('FolioLineItemsRepository', () => {
  let repository: FolioLineItemsRepository;
  let prisma: {
    folioLineItem: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      folioLineItem: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    repository = new FolioLineItemsRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('creates folio line items with the standard projection', async () => {
    await repository.createLineItem({
      folioId: 10,
      type: FolioLineItemType.MANUAL_CHARGE,
      description: 'Room charge',
      quantity: 2,
      unitAmount: '100',
      totalAmount: '200',
      postedByUserId: 1,
    });

    expect(prisma.folioLineItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          folioId: 10,
          type: FolioLineItemType.MANUAL_CHARGE,
          description: 'Room charge',
          quantity: 2,
          unitAmount: '100',
          totalAmount: '200',
          postedByUserId: 1,
        },
        select: expect.objectContaining({
          id: true,
          folioId: true,
          postedBy: expect.any(Object),
        }),
      }),
    );
  });

  it('lists non-voided line items by folio and type with stable ordering', async () => {
    await repository.listLineItems({
      folioId: 10,
      type: FolioLineItemType.MANUAL_CHARGE,
      includeVoided: false,
    });

    expect(prisma.folioLineItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          folioId: 10,
          type: FolioLineItemType.MANUAL_CHARGE,
          isVoided: false,
        },
        orderBy: [{ postedAt: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('updates one line item by id', async () => {
    await repository.updateLineItem(3, {
      isVoided: true,
      voidReason: 'Incorrect charge',
    });

    expect(prisma.folioLineItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 3,
        },
        data: {
          isVoided: true,
          voidReason: 'Incorrect charge',
        },
      }),
    );
  });
});
