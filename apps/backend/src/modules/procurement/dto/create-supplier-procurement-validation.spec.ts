import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateSupplierDto } from './create-supplier.dto';

describe('CreateSupplierDto procurement regression', () => {
  it('requires supplier number for procurement suppliers', async () => {
    const dto = plainToInstance(CreateSupplierDto, {
      name: 'Addis Fresh Foods',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'supplierNumber')).toBe(
      true,
    );
  });
});
