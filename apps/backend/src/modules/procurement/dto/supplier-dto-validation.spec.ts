import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SupplierStatus } from '../../../generated/prisma/client';
import { CreateSupplierDto } from './create-supplier.dto';
import { GetSuppliersQueryDto } from './get-suppliers-query.dto';
import { UpdateSupplierDto } from './update-supplier.dto';

describe('Supplier DTO validation', () => {
  it('accepts a valid supplier payload', async () => {
    const dto = plainToInstance(CreateSupplierDto, {
      supplierNumber: 'sup-0001',
      name: 'Addis Fresh Foods',
      email: 'orders@example.com',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid supplier email and blank names', async () => {
    const dto = plainToInstance(CreateSupplierDto, {
      supplierNumber: 'SUP-0001',
      name: '',
      email: 'not-email',
    });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'name')).toBe(true);
    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });

  it('transforms supplier list query pagination and status', async () => {
    const dto = plainToInstance(GetSuppliersQueryDto, {
      page: '2',
      limit: '25',
      status: SupplierStatus.ACTIVE,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      page: 2,
      limit: 25,
      status: SupplierStatus.ACTIVE,
    });
  });

  it('allows partial supplier updates', async () => {
    const dto = plainToInstance(UpdateSupplierDto, {
      phone: '+251911111111',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
