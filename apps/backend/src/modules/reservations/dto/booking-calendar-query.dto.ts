import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

import { ReservationStatus } from '../../../generated/prisma/client';
import { IsAfterDateProperty } from './is-after-date-property.decorator';

export class BookingCalendarQueryDto {
  @ApiProperty({
    example: '2026-06-01',
    description: 'Calendar range start date as an ISO date string.',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    example: '2026-06-30',
    description: 'Calendar range end date as an ISO date string.',
  })
  @IsDateString()
  @IsAfterDateProperty('startDate')
  endDate!: string;

  @ApiPropertyOptional({
    example: 101,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  roomId?: number;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  roomTypeId?: number;

  @ApiPropertyOptional({
    enum: ReservationStatus,
    example: ReservationStatus.CONFIRMED,
  })
  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;
}
