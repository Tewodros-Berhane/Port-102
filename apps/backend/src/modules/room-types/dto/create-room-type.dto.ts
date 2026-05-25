import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateRoomTypeDto {
  @ApiProperty({
    example: 'Deluxe King',
    description: 'Human-readable room type name.',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'DLX-KING',
    description:
      'Stable room type code. It is normalized to uppercase before storage.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  code!: string;

  @ApiPropertyOptional({
    example: 'Large king room with premium amenities.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @IsOptional()
  baseOccupancy?: number;

  @ApiPropertyOptional({
    example: 3,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @IsOptional()
  maxOccupancy?: number;

  @ApiPropertyOptional({
    example: 125.5,
    minimum: 0,
    description: 'Base room rate with up to two decimal places.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  baseRate?: number;
}
