import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateRoomTypeDto {
  @ApiPropertyOptional({
    example: 'Deluxe King',
    description: 'Human-readable room type name.',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'DLX-KING',
    description:
      'Stable room type code. It is normalized to uppercase before storage.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    example: 'Large king room with premium amenities.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @IsOptional()
  baseOccupancy?: number;

  @ApiPropertyOptional({
    example: 3,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @IsOptional()
  maxOccupancy?: number;

  @ApiPropertyOptional({
    example: 125.5,
    minimum: 0,
    nullable: true,
    description: 'Base room rate with up to two decimal places.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  baseRate?: number | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the room type can be assigned to rooms.',
  })
  @Transform(({ value }) => {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
