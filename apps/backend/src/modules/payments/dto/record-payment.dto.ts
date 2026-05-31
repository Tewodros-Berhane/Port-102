import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { PaymentMethod } from '../../../generated/prisma/client';

export class RecordPaymentDto {
  @ApiProperty({
    example: 7,
    description: 'Folio receiving the payment.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  folioId!: number;

  @ApiProperty({
    example: 150,
    minimum: 0.01,
    description: 'Payment amount to record against the folio balance.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
  })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({
    example: 'AUTH-123456',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(120)
  @IsOptional()
  reference?: string | null;

  @ApiPropertyOptional({
    example: 'Guest paid at front desk.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string | null;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Whether to generate a receipt immediately.',
  })
  @IsBoolean()
  @IsOptional()
  generateReceipt = false;
}
