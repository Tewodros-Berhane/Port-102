import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import {
  InventoryItemStatus,
  InventoryItemType,
} from '../../../generated/prisma/client';

export class CreateInventoryItemDto {
  @ApiProperty({
    example: 'INV-FOOD-0001',
    description: 'Unique inventory item number. It is normalized to uppercase.',
    maxLength: 60,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  itemNumber!: string;

  @ApiProperty({
    example: 'Basmati Rice',
    description: 'Human-readable inventory item name.',
    maxLength: 160,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiProperty({
    enum: InventoryItemType,
    example: InventoryItemType.FOOD,
  })
  @IsEnum(InventoryItemType)
  type!: InventoryItemType;

  @ApiPropertyOptional({
    example: 'Dry Goods',
    nullable: true,
    maxLength: 100,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(100)
  @IsOptional()
  category?: string | null;

  @ApiProperty({
    example: 'KG',
    description: 'Required stock unit of measure.',
    maxLength: 40,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  unitOfMeasure!: string;

  @ApiPropertyOptional({
    example: 25,
    minimum: 0,
    nullable: true,
    description: 'Quantity at or below which the item is considered low stock.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  reorderLevel?: number | null;

  @ApiPropertyOptional({
    example: 100,
    minimum: 0,
    nullable: true,
    description: 'Suggested replenishment quantity.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  reorderQuantity?: number | null;

  @ApiPropertyOptional({
    example: 145.5,
    minimum: 0,
    nullable: true,
    description:
      'Initial basic average cost. Later receipts can update this value.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  averageCost?: number | null;

  @ApiPropertyOptional({
    enum: InventoryItemStatus,
    example: InventoryItemStatus.ACTIVE,
    default: InventoryItemStatus.ACTIVE,
  })
  @IsEnum(InventoryItemStatus)
  @IsOptional()
  status?: InventoryItemStatus;

  @ApiPropertyOptional({
    example: 'Long-grain rice used by the main kitchen.',
    nullable: true,
    maxLength: 500,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string | null;
}
