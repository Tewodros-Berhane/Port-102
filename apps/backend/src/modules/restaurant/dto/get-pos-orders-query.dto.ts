import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import {
  PosOrderPaymentStatus,
  PosOrderSource,
  PosOrderStatus,
} from '../../../generated/prisma/client';

export class GetPosOrdersQueryDto {
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
    example: 'T-12',
    description: 'Search order number, table, notes, or outlet.',
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

  @ApiPropertyOptional({ enum: PosOrderStatus })
  @IsEnum(PosOrderStatus)
  @IsOptional()
  status?: PosOrderStatus;

  @ApiPropertyOptional({ enum: PosOrderPaymentStatus })
  @IsEnum(PosOrderPaymentStatus)
  @IsOptional()
  paymentStatus?: PosOrderPaymentStatus;

  @ApiPropertyOptional({ enum: PosOrderSource })
  @IsEnum(PosOrderSource)
  @IsOptional()
  source?: PosOrderSource;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsDateString()
  @IsOptional()
  createdFrom?: string;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.999Z' })
  @IsDateString()
  @IsOptional()
  createdTo?: string;
}
