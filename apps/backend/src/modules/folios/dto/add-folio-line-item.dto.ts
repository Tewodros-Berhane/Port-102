import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { FolioLineItemType } from '../../../generated/prisma/client';

export class AddFolioLineItemDto {
  @ApiProperty({
    enum: FolioLineItemType,
    example: FolioLineItemType.MANUAL_CHARGE,
  })
  @IsEnum(FolioLineItemType)
  type!: FolioLineItemType;

  @ApiProperty({
    example: 'Extra bed charge',
    description: 'Guest-facing line item description.',
  })
  @IsString()
  @MaxLength(255)
  description!: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity = 1;

  @ApiProperty({
    example: 45,
    minimum: 0.01,
    description: 'Unit amount before quantity multiplication.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  unitAmount!: number;

  @ApiPropertyOptional({
    example: 'nightly_audit',
    description: 'Optional source system for traceability.',
  })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  sourceType?: string;

  @ApiPropertyOptional({
    example: 123,
    minimum: 1,
    description: 'Optional source record identifier.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  sourceId?: number;
}
