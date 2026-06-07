import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { MenuItemStatus } from '../../../generated/prisma/client';

export class UpdateMenuItemDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  outletId?: number;

  @ApiPropertyOptional({ example: 'Special Tibs' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'FOOD-TIBS-01' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  @MaxLength(80)
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'Main Course', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(120)
  @IsOptional()
  category?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ example: 475, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ enum: MenuItemStatus })
  @IsEnum(MenuItemStatus)
  @IsOptional()
  status?: MenuItemStatus;
}
