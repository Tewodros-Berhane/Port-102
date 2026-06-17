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
  it('accepts dashboard recent movement limit 5', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      locationId: '5',
      recentMovementsLimit: '5',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ locationId: 5, recentMovementsLimit: 5 });
  });
  it('accepts dashboard recent movement limit 6', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      locationId: '6',
      recentMovementsLimit: '6',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ locationId: 6, recentMovementsLimit: 6 });
  });
  it('accepts dashboard recent movement limit 7', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      locationId: '7',
      recentMovementsLimit: '7',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ locationId: 7, recentMovementsLimit: 7 });
  });
  it('accepts dashboard recent movement limit 8', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      locationId: '8',
      recentMovementsLimit: '8',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ locationId: 8, recentMovementsLimit: 8 });
  });
  it('rejects dashboard recent movement limit 26', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      recentMovementsLimit: '26',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'recentMovementsLimit')).toBe(true);
  });
  it('rejects dashboard recent movement limit 27', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      recentMovementsLimit: '27',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'recentMovementsLimit')).toBe(true);
  });
  it('rejects dashboard recent movement limit 28', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      recentMovementsLimit: '28',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'recentMovementsLimit')).toBe(true);
  });
  it('rejects dashboard recent movement limit 29', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      recentMovementsLimit: '29',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'recentMovementsLimit')).toBe(true);
  });
  it('rejects dashboard recent movement limit 30', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      recentMovementsLimit: '30',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'recentMovementsLimit')).toBe(true);
  });
  it('rejects dashboard recent movement limit 31', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      recentMovementsLimit: '31',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'recentMovementsLimit')).toBe(true);
  });
  it('rejects dashboard recent movement limit 32', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      recentMovementsLimit: '32',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'recentMovementsLimit')).toBe(true);
  });
  it('rejects dashboard recent movement limit 33', async () => {
    const dto = plainToInstance(InventoryDashboardQueryDto, {
      recentMovementsLimit: '33',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'recentMovementsLimit')).toBe(true);
  });
  it('transforms reorder alert query set 1', async () => {
    const dto = plainToInstance(GetReorderAlertsQueryDto, {
      page: '1',
      limit: '10',
      search: 'rice',
      locationId: '1',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ page: 1, limit: 10, locationId: 1 });
  });
  it('transforms reorder alert query set 2', async () => {
    const dto = plainToInstance(GetReorderAlertsQueryDto, {
      page: '2',
      limit: '20',
      search: 'rice',
      locationId: '2',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ page: 2, limit: 20, locationId: 2 });
  });
  it('transforms reorder alert query set 3', async () => {
    const dto = plainToInstance(GetReorderAlertsQueryDto, {
      page: '3',
      limit: '30',
      search: 'rice',
      locationId: '3',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ page: 3, limit: 30, locationId: 3 });
  });
  it('transforms reorder alert query set 4', async () => {
    const dto = plainToInstance(GetReorderAlertsQueryDto, {
      page: '4',
      limit: '40',
      search: 'rice',
      locationId: '4',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ page: 4, limit: 40, locationId: 4 });
  });
  it('transforms reorder alert query set 5', async () => {
    const dto = plainToInstance(GetReorderAlertsQueryDto, {
      page: '5',
      limit: '50',
      search: 'rice',
      locationId: '5',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ page: 5, limit: 50, locationId: 5 });
  });
  it('transforms reorder alert query set 6', async () => {
    const dto = plainToInstance(GetReorderAlertsQueryDto, {
      page: '6',
      limit: '60',
      search: 'rice',
      locationId: '6',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ page: 6, limit: 60, locationId: 6 });
  });
  it('transforms reorder alert query set 7', async () => {
    const dto = plainToInstance(GetReorderAlertsQueryDto, {
      page: '7',
      limit: '70',
      search: 'rice',
      locationId: '7',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ page: 7, limit: 70, locationId: 7 });
  });
  it('transforms reorder alert query set 8', async () => {
    const dto = plainToInstance(GetReorderAlertsQueryDto, {
      page: '8',
      limit: '80',
      search: 'rice',
      locationId: '8',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ page: 8, limit: 80, locationId: 8 });
  });
  it('accepts supplier number sup-0001', async () => {
    const dto = plainToInstance(CreateSupplierDto, {
      supplierNumber: 'sup-0001',
      name: 'Supplier 1',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
  it('accepts supplier number sup-0002', async () => {
    const dto = plainToInstance(CreateSupplierDto, {
      supplierNumber: 'sup-0002',
      name: 'Supplier 2',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
  it('accepts supplier number sup-0003', async () => {
    const dto = plainToInstance(CreateSupplierDto, {
      supplierNumber: 'sup-0003',
      name: 'Supplier 3',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
  it('accepts supplier number sup-0004', async () => {
    const dto = plainToInstance(CreateSupplierDto, {
      supplierNumber: 'sup-0004',
      name: 'Supplier 4',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
  it('accepts supplier number sup-0005', async () => {
    const dto = plainToInstance(CreateSupplierDto, {
      supplierNumber: 'sup-0005',
      name: 'Supplier 5',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
  it('accepts supplier number sup-0006', async () => {
    const dto = plainToInstance(CreateSupplierDto, {
      supplierNumber: 'sup-0006',
      name: 'Supplier 6',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
  it('accepts supplier number sup-0007', async () => {
    const dto = plainToInstance(CreateSupplierDto, {
      supplierNumber: 'sup-0007',
      name: 'Supplier 7',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
  it('accepts supplier number sup-0008', async () => {
    const dto = plainToInstance(CreateSupplierDto, {
      supplierNumber: 'sup-0008',
      name: 'Supplier 8',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
  it('rejects invalid supplier email 1', async () => {
    const dto = plainToInstance(CreateSupplierDto, {
      supplierNumber: 'SUP-BAD-1',
      name: 'Supplier 1',
      email: 'bad-email-1',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });
