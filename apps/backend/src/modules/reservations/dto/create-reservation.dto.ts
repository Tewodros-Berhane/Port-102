import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { ReservationSource } from '../../../generated/prisma/client';
import { AddReservationRoomDto } from './add-reservation-room.dto';
import { IsAfterDateProperty } from './is-after-date-property.decorator';

export class CreateReservationDto {
  @ApiProperty({
    example: 12,
    description: 'Active guest ID for the reservation.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guestId!: number;

  @ApiProperty({
    example: '2026-06-10',
    description: 'Reservation arrival date as an ISO date string.',
  })
  @IsDateString()
  checkInDate!: string;

  @ApiProperty({
    example: '2026-06-12',
    description: 'Reservation departure date as an ISO date string.',
  })
  @IsDateString()
  @IsAfterDateProperty('checkInDate')
  checkOutDate!: string;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  adults = 1;

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    default: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  children = 0;

