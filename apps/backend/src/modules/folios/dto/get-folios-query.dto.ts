import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { FolioStatus } from '../../../generated/prisma/client';

export class GetFoliosQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;

  @ApiPropertyOptional({
    example: 'FOL-20260610',
    description: 'Search folio number, stay number, or guest name/contact.',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: FolioStatus, example: FolioStatus.OPEN })
  @IsEnum(FolioStatus)
  @IsOptional()
  status?: FolioStatus;

  @ApiPropertyOptional({ example: 40, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  stayId?: number;

  @ApiPropertyOptional({ example: 12, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  guestId?: number;

  @ApiPropertyOptional({
    example: '2026-06-01',
    description: 'Filter folios opened on or after this date.',
  })
  @IsDateString()
  @IsOptional()
  openedFrom?: string;

  @ApiPropertyOptional({
    example: '2026-06-30',
    description: 'Filter folios opened before or on this date.',
  })
  @IsDateString()
  @IsOptional()
  openedTo?: string;
}
