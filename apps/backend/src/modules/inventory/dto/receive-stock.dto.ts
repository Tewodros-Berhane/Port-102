import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ReceiveStockDto {
  @ApiProperty({ example: 7, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemId!: number;

  @ApiProperty({ example: 4, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  locationId!: number;

  @ApiProperty({ example: 50, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity!: number;

  @ApiPropertyOptional({
    example: 150.75,
    minimum: 0,
    description: 'Optional unit cost used to update weighted average cost.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  unitCost?: number;

  @ApiPropertyOptional({
    example: 'SUPPLIER_DELIVERY',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @IsOptional()
  referenceType?: string;

  @ApiPropertyOptional({ example: 42, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  referenceId?: number;

  @ApiPropertyOptional({ example: 'Opening stock receipt.', maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    example: 'Received against supplier delivery note 104.',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}
