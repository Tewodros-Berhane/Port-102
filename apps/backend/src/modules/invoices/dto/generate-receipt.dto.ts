import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';

export class GenerateReceiptDto {
  @ApiProperty({
    example: 7,
    description: 'Folio receiving the receipt.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  folioId!: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Payment to link to the receipt.',
    minimum: 1,
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  paymentId?: number | null;

  @ApiPropertyOptional({
    example: 150,
    minimum: 0.01,
    description:
      'Receipt amount when not deriving the amount from a linked payment.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsOptional()
  amount?: number | null;
}
