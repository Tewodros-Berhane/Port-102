import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { CreateInventoryLocationDto } from './create-inventory-location.dto';

export class UpdateInventoryLocationDto extends PartialType(
  CreateInventoryLocationDto,
) {
  @ApiPropertyOptional({
    example: true,
    description:
      'Whether the location can participate in stock operations. Deletion uses soft deactivation.',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
