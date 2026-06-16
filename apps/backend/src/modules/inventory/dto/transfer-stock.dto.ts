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
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'differentTransferLocations', async: false })
class DifferentTransferLocationsConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args?: ValidationArguments) {
    const dto = args?.object as TransferStockDto | undefined;

    return dto?.fromLocationId !== dto?.toLocationId;
  }

  defaultMessage() {
    return 'fromLocationId and toLocationId must be different.';
  }
}

export class TransferStockDto {
  @ApiProperty({ example: 7, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemId!: number;

  @ApiProperty({ example: 4, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fromLocationId!: number;

  @ApiProperty({ example: 5, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Validate(DifferentTransferLocationsConstraint)
  toLocationId!: number;

  @ApiProperty({ example: 8, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity!: number;

  @ApiPropertyOptional({ example: 'STORE_REPLENISHMENT', maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @IsOptional()
  referenceType?: string;

  @ApiPropertyOptional({ example: 12, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  referenceId?: number;

  @ApiPropertyOptional({
    example: 'Move stock from main store to kitchen store.',
    maxLength: 300,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    example: 'Requested by the outlet supervisor.',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}
