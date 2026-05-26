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

import {
  ReservationSource,
  ReservationStatus,
} from '../../../generated/prisma/client';
import { IsAfterDateProperty } from './is-after-date-property.decorator';

export class GetReservationsQueryDto {
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
    example: 'RES-20260527-0001',
    description: 'Search reservation number or guest name/email/phone.',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: ReservationStatus,
    example: ReservationStatus.CONFIRMED,
  })
  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @ApiPropertyOptional({
    enum: ReservationSource,
    example: ReservationSource.WALK_IN,
  })
  @IsEnum(ReservationSource)
  @IsOptional()
  source?: ReservationSource;

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
    description: 'Filter reservations arriving on or after this date.',
  })
  @IsDateString()
  @IsOptional()
  checkInFrom?: string;

  @ApiPropertyOptional({
    example: '2026-06-30',
    description: 'Filter reservations arriving on or before this date.',
  })
  @IsDateString()
  @IsAfterDateProperty('checkInFrom')
  @IsOptional()
  checkInTo?: string;

  @ApiPropertyOptional({
    example: '2026-06-01',
    description: 'Filter reservations departing on or after this date.',
  })
  @IsDateString()
  @IsOptional()
  checkOutFrom?: string;

  @ApiPropertyOptional({
    example: '2026-06-30',
    description: 'Filter reservations departing on or before this date.',
  })
  @IsDateString()
  @IsAfterDateProperty('checkOutFrom')
  @IsOptional()
  checkOutTo?: string;
}
