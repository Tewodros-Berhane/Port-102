import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

import { IsAfterDateProperty } from './is-after-date-property.decorator';

export class AvailabilitySearchQueryDto {
  @ApiProperty({
    example: '2026-06-10',
    description: 'Requested arrival date as an ISO date string.',
  })
  @IsDateString()
  checkInDate!: string;

  @ApiProperty({
    example: '2026-06-12',
    description: 'Requested departure date as an ISO date string.',
  })
  @IsDateString()
  @IsAfterDateProperty('checkInDate')
  checkOutDate!: string;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    description: 'Optional room type filter.',
  })
  @Type(() => Number)
