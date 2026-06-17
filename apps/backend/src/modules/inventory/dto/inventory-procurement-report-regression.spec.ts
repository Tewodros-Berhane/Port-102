import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SupplierStatus } from '../../../generated/prisma/client';
import { CreateSupplierDto } from '../../procurement/dto/create-supplier.dto';
import { GetSuppliersQueryDto } from '../../procurement/dto/get-suppliers-query.dto';
import { UpdateSupplierDto } from '../../procurement/dto/update-supplier.dto';
import { GetReorderAlertsQueryDto } from './get-reorder-alerts-query.dto';
import { InventoryDashboardQueryDto } from './inventory-dashboard-query.dto';

describe('Inventory reports and supplier regression coverage', () => {
  it('accepts dashboard recent movement limit 1', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      locationId: '1',
      recentMovementsLimit: '1',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ locationId: 1, recentMovementsLimit: 1 });
  });
  it('accepts dashboard recent movement limit 2', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      locationId: '2',
      recentMovementsLimit: '2',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ locationId: 2, recentMovementsLimit: 2 });
  });
  it('accepts dashboard recent movement limit 3', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      locationId: '3',
      recentMovementsLimit: '3',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ locationId: 3, recentMovementsLimit: 3 });
  });
  it('accepts dashboard recent movement limit 4', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      locationId: '4',
      recentMovementsLimit: '4',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ locationId: 4, recentMovementsLimit: 4 });
  });
