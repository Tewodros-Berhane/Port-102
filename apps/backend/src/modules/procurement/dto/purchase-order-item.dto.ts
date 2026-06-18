import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PurchaseOrderItemDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemId: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ example: 38.25 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 'Case pack pricing' })
  @IsOptional()
  @IsString()
  notes?: string;
}
