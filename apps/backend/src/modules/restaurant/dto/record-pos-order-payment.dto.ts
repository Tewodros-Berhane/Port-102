import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { PosPaymentMethod } from '../../../generated/prisma/client';

export class RecordPosOrderPaymentDto {
  @ApiProperty({ example: 450, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({
    enum: PosPaymentMethod,
    example: PosPaymentMethod.CASH,
  })
  @IsEnum(PosPaymentMethod)
  method!: PosPaymentMethod;

  @ApiPropertyOptional({ example: 'AUTH-123456', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(120)
  @IsOptional()
  reference?: string | null;

  @ApiPropertyOptional({
    example: 'Paid at restaurant cashier.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string | null;
}
