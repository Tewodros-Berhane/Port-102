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
