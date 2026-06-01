import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateHousekeepingTaskDto {
  @ApiPropertyOptional({
    example: 12,
    minimum: 1,
    description: 'Move this task to another active room.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
