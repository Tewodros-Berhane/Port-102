import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import {
  InventoryItemStatus,
  InventoryItemType,
} from '../../../generated/prisma/client';

export class GetInventoryItemsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;

  @ApiPropertyOptional({
    example: 'rice',
    description:
      'Search item number, name, category, unit of measure, or description.',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: InventoryItemStatus,
    example: InventoryItemStatus.ACTIVE,
  })
  @IsEnum(InventoryItemStatus)
  @IsOptional()
  status?: InventoryItemStatus;

  @ApiPropertyOptional({
    enum: InventoryItemType,
    example: InventoryItemType.FOOD,
  })
  @IsEnum(InventoryItemType)
  @IsOptional()
  type?: InventoryItemType;

  @ApiPropertyOptional({ example: 'Dry Goods' })
  @IsString()
  @IsOptional()
  category?: string;
}
