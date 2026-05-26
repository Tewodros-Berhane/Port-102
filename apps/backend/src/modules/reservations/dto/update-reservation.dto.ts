import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

import { ReservationSource } from '../../../generated/prisma/client';
import { IsAfterDateProperty } from './is-after-date-property.decorator';

export class UpdateReservationDto {
  @ApiPropertyOptional({
    example: 12,
    description: 'Active guest ID for the reservation.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  guestId?: number;

  @ApiPropertyOptional({
    example: '2026-06-10',
    description: 'Reservation arrival date as an ISO date string.',
  })
  @IsDateString()
  @IsOptional()
  checkInDate?: string;

  @ApiPropertyOptional({
    example: '2026-06-12',
    description: 'Reservation departure date as an ISO date string.',
  })
  @IsDateString()
  @IsAfterDateProperty('checkInDate')
  @IsOptional()
  checkOutDate?: string;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  adults?: number;

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
