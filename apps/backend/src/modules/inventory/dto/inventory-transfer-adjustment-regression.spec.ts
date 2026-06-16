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

describe('Same-location transfer rejection 1', () => {
  it('rejects transfer where both locations are 21', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 21,
      toLocationId: 21,
      quantity: 1,
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'toLocationId')).toBe(true);
  });
});

describe('Same-location transfer rejection 2', () => {
  it('rejects transfer where both locations are 22', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 22,
      toLocationId: 22,
      quantity: 1,
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'toLocationId')).toBe(true);
  });
});

describe('Same-location transfer rejection 3', () => {
  it('rejects transfer where both locations are 23', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 23,
      toLocationId: 23,
      quantity: 1,
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'toLocationId')).toBe(true);
  });
});

describe('Same-location transfer rejection 4', () => {
  it('rejects transfer where both locations are 24', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 24,
      toLocationId: 24,
      quantity: 1,
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'toLocationId')).toBe(true);
  });
});

describe('Same-location transfer rejection 5', () => {
  it('rejects transfer where both locations are 25', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 25,
      toLocationId: 25,
      quantity: 1,
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'toLocationId')).toBe(true);
  });
});

describe('Same-location transfer rejection 6', () => {
  it('rejects transfer where both locations are 26', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 26,
      toLocationId: 26,
      quantity: 1,
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'toLocationId')).toBe(true);
  });
});

describe('Same-location transfer rejection 7', () => {
  it('rejects transfer where both locations are 27', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 27,
      toLocationId: 27,
      quantity: 1,
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'toLocationId')).toBe(true);
  });
});

describe('Same-location transfer rejection 8', () => {
  it('rejects transfer where both locations are 28', async () => {
    const dto = plainToInstance(TransferStockDto, {
      itemId: 7,
      fromLocationId: 28,
      toLocationId: 28,
      quantity: 1,
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'toLocationId')).toBe(true);
  });
});

describe('Negative adjustment request 1', () => {
  it('accepts signed decrease adjustment quantity -1', async () => {
    const dto = plainToInstance(CreateStockAdjustmentDto, {
      itemId: 7,
      locationId: 4,
      quantity: -1,
      reason: 'Physical count variance 1.',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(-1);
  });
});

describe('Negative adjustment request 2', () => {
  it('accepts signed decrease adjustment quantity -2', async () => {
    const dto = plainToInstance(CreateStockAdjustmentDto, {
      itemId: 7,
      locationId: 4,
      quantity: -2,
      reason: 'Physical count variance 2.',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(-2);
  });
});

describe('Negative adjustment request 3', () => {
  it('accepts signed decrease adjustment quantity -3', async () => {
    const dto = plainToInstance(CreateStockAdjustmentDto, {
      itemId: 7,
      locationId: 4,
      quantity: -3,
      reason: 'Physical count variance 3.',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(-3);
  });
});

describe('Negative adjustment request 4', () => {
  it('accepts signed decrease adjustment quantity -4', async () => {
    const dto = plainToInstance(CreateStockAdjustmentDto, {
      itemId: 7,
      locationId: 4,
      quantity: -4,
      reason: 'Physical count variance 4.',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(-4);
  });
});

describe('Negative adjustment request 5', () => {
  it('accepts signed decrease adjustment quantity -5', async () => {
    const dto = plainToInstance(CreateStockAdjustmentDto, {
      itemId: 7,
      locationId: 4,
      quantity: -5,
      reason: 'Physical count variance 5.',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(-5);
  });
});

describe('Negative adjustment request 6', () => {
  it('accepts signed decrease adjustment quantity -6', async () => {
    const dto = plainToInstance(CreateStockAdjustmentDto, {
      itemId: 7,
      locationId: 4,
      quantity: -6,
      reason: 'Physical count variance 6.',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(-6);
  });
});

describe('Positive adjustment request 1', () => {
  it('accepts signed increase adjustment quantity 1', async () => {
    const dto = plainToInstance(CreateStockAdjustmentDto, {
      itemId: 7,
      locationId: 4,
      quantity: 1,
      reason: 'Found stock variance 1.',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(1);
  });
});

describe('Positive adjustment request 2', () => {
  it('accepts signed increase adjustment quantity 2', async () => {
    const dto = plainToInstance(CreateStockAdjustmentDto, {
      itemId: 7,
      locationId: 4,
      quantity: 2,
      reason: 'Found stock variance 2.',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(2);
  });
});

describe('Positive adjustment request 3', () => {
  it('accepts signed increase adjustment quantity 3', async () => {
    const dto = plainToInstance(CreateStockAdjustmentDto, {
      itemId: 7,
      locationId: 4,
      quantity: 3,
      reason: 'Found stock variance 3.',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.quantity).toBe(3);
  });
});
