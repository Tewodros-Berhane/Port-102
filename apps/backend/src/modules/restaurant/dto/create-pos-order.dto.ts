import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { PosOrderSource } from '../../../generated/prisma/client';

export class CreatePosOrderDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  outletId!: number;

  @ApiPropertyOptional({
    enum: PosOrderSource,
    example: PosOrderSource.MANUAL,
    default: PosOrderSource.MANUAL,
  })
  @IsEnum(PosOrderSource)
  @IsOptional()
  source?: PosOrderSource;

  @ApiPropertyOptional({ example: 'T-12', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(80)
  @IsOptional()
  tableNumber?: string | null;

  @ApiPropertyOptional({
    example: 'Cashier entered the waiter ticket.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string | null;
}
