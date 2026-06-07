import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateMenuItemDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  outletId!: number;

  @ApiProperty({ example: 'Special Tibs' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiProperty({
    example: 'FOOD-TIBS-01',
    description: 'Unique code within the selected outlet.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  @MaxLength(80)
  code!: string;

  @ApiPropertyOptional({ example: 'Main Course', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(120)
  @IsOptional()
  category?: string | null;

  @ApiPropertyOptional({
    example: 'Beef tibs served with injera.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string | null;

  @ApiProperty({ example: 450, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price!: number;

  @ApiPropertyOptional({
    enum: MenuItemStatus,
    example: MenuItemStatus.ACTIVE,
    default: MenuItemStatus.ACTIVE,
  })
  @IsEnum(MenuItemStatus)
  @IsOptional()
  status?: MenuItemStatus;
}
