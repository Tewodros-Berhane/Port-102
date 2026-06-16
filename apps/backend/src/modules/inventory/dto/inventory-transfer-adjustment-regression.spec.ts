import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { StockAdjustmentStatus } from '../../../generated/prisma/client';
import { ApproveStockAdjustmentDto } from './approve-stock-adjustment.dto';
import { CancelStockAdjustmentDto } from './cancel-stock-adjustment.dto';
import { CreateStockAdjustmentDto } from './create-stock-adjustment.dto';
import { GetStockAdjustmentsQueryDto } from './get-stock-adjustments-query.dto';
import { RejectStockAdjustmentDto } from './reject-stock-adjustment.dto';
import { TransferStockDto } from './transfer-stock.dto';

describe('Inventory transfer and adjustment regression coverage', () => {
  it('accepts a transfer to a different location with a trimmed reason', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: '7',
      fromLocationId: '4',
      toLocationId: '5',
      quantity: '1.25',
      reason: ' Kitchen replenishment ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      itemId: 7,
      fromLocationId: 4,
      toLocationId: 5,
      quantity: 1.25,
    });
  });
});

describe('Transfer quantity acceptance 1', () => {
  it('accepts transfer quantity 1.50 for active-location movement', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 4,
      toLocationId: 11,
      quantity: 1.50,
      referenceType: 'STORE_REPLENISHMENT',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(1.50);
  });
});

describe('Transfer quantity acceptance 2', () => {
  it('accepts transfer quantity 2.50 for active-location movement', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 4,
      toLocationId: 12,
      quantity: 2.50,
      referenceType: 'STORE_REPLENISHMENT',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(2.50);
  });
});

describe('Transfer quantity acceptance 3', () => {
  it('accepts transfer quantity 3.50 for active-location movement', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 4,
      toLocationId: 13,
      quantity: 3.50,
      referenceType: 'STORE_REPLENISHMENT',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(3.50);
  });
});

describe('Transfer quantity acceptance 4', () => {
  it('accepts transfer quantity 4.50 for active-location movement', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 4,
      toLocationId: 14,
      quantity: 4.50,
      referenceType: 'STORE_REPLENISHMENT',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(4.50);
  });
});

describe('Transfer quantity acceptance 5', () => {
  it('accepts transfer quantity 5.50 for active-location movement', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 4,
      toLocationId: 15,
      quantity: 5.50,
      referenceType: 'STORE_REPLENISHMENT',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(5.50);
  });
});

describe('Transfer quantity acceptance 6', () => {
  it('accepts transfer quantity 6.50 for active-location movement', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 4,
      toLocationId: 16,
      quantity: 6.50,
      referenceType: 'STORE_REPLENISHMENT',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(6.50);
  });
});

describe('Transfer quantity acceptance 7', () => {
  it('accepts transfer quantity 7.50 for active-location movement', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 4,
      toLocationId: 17,
      quantity: 7.50,
      referenceType: 'STORE_REPLENISHMENT',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(7.50);
  });
});

describe('Transfer quantity acceptance 8', () => {
  it('accepts transfer quantity 8.50 for active-location movement', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 4,
      toLocationId: 18,
      quantity: 8.50,
      referenceType: 'STORE_REPLENISHMENT',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(8.50);
  });
});
