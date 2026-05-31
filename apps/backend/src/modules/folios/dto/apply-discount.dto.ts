import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class ApplyDiscountDto {
  @ApiProperty({
    example: 'Service recovery discount',
    description: 'Discount line item description.',
  })
  @IsString()
  @MaxLength(255)
  description!: string;

  @ApiPropertyOptional({
    example: 25,
    minimum: 0.01,
    description:
      'Fixed discount amount. Service logic rejects requests without amount or percent.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsOptional()
  amount?: number | null;

  @ApiPropertyOptional({
    example: 10,
    minimum: 0.01,
    maximum: 100,
    description:
      'Discount percentage. Service logic enforces small-discount limits.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  @IsOptional()
  percent?: number | null;

  @ApiPropertyOptional({
    example: 'Guest experienced delayed room readiness.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string | null;
}
