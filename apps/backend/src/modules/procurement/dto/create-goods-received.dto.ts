import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { GoodsReceivedItemDto } from './goods-received-item.dto';

export class CreateGoodsReceivedDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  purchaseOrderId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId?: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  locationId: number;

  @ApiPropertyOptional({ example: 'Invoice INV-4411' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [GoodsReceivedItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GoodsReceivedItemDto)
  items: GoodsReceivedItemDto[];
}
