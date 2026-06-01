import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

import {
  HousekeepingPriority,
  HousekeepingTaskType,
} from '../../../generated/prisma/client';

export class CreateHousekeepingTaskDto {
  @ApiProperty({
    example: 12,
    minimum: 1,
    description: 'Active room that needs housekeeping work.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId!: number;

  @ApiPropertyOptional({
    enum: HousekeepingTaskType,
