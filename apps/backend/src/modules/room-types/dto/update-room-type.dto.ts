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
