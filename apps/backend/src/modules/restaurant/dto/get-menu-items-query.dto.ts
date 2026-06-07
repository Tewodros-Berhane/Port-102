import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { MenuItemStatus } from '../../../generated/prisma/client';

export class GetMenuItemsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;

  @ApiPropertyOptional({
    example: 'tibs',
    description: 'Search item name, code, category, or description.',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  outletId?: number;

  @ApiPropertyOptional({ enum: MenuItemStatus })
  @IsEnum(MenuItemStatus)
  @IsOptional()
  status?: MenuItemStatus;

  @ApiPropertyOptional({ example: 'Main Course' })
  @IsString()
  @IsOptional()
  category?: string;
}
