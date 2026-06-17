import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { SupplierStatus } from '../../../generated/prisma/client';

export class GetSuppliersQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'fresh' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: SupplierStatus })
  @IsEnum(SupplierStatus)
  @IsOptional()
  status?: SupplierStatus;
}
