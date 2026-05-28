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

import { StayStatus } from '../../../generated/prisma/client';
import { IsAfterDateProperty } from '../../reservations/dto/is-after-date-property.decorator';

export class GetStaysQueryDto {
  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;

  @ApiPropertyOptional({
    example: 'STAY-20260610-0001',
    description:
      'Search stay number, reservation number, guest details, or room number.',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: StayStatus,
    example: StayStatus.ACTIVE,
  })
  @IsEnum(StayStatus)
  @IsOptional()
  status?: StayStatus;

  @ApiPropertyOptional({
    example: 12,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  guestId?: number;

  @ApiPropertyOptional({
    example: '2026-06-01',
    description: 'Filter stays checked in on or after this date.',
  })
  @IsDateString()
  @IsOptional()
  checkedInFrom?: string;

  @ApiPropertyOptional({
    example: '2026-06-30',
    description: 'Filter stays checked in on or before this date.',
  })
  @IsDateString()
  @IsAfterDateProperty('checkedInFrom')
  @IsOptional()
  checkedInTo?: string;

  @ApiPropertyOptional({
    example: '2026-06-01',
    description: 'Filter expected departures on or after this date.',
  })
  @IsDateString()
  @IsOptional()
  expectedCheckOutFrom?: string;

  @ApiPropertyOptional({
    example: '2026-06-30',
    description: 'Filter expected departures on or before this date.',
  })
  @IsDateString()
  @IsAfterDateProperty('expectedCheckOutFrom')
  @IsOptional()
  expectedCheckOutTo?: string;
}
