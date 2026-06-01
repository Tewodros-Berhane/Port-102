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
  HousekeepingPriority,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
} from '../../../generated/prisma/client';

export class GetHousekeepingTasksQueryDto {
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
    example: '101',
    description: 'Search task number, notes, room number, or assignee.',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: HousekeepingTaskStatus,
    example: HousekeepingTaskStatus.PENDING,
  })
  @IsEnum(HousekeepingTaskStatus)
  @IsOptional()
  status?: HousekeepingTaskStatus;

  @ApiPropertyOptional({
    enum: HousekeepingTaskType,
    example: HousekeepingTaskType.CHECKOUT_CLEANING,
  })
  @IsEnum(HousekeepingTaskType)
  @IsOptional()
  type?: HousekeepingTaskType;

  @ApiPropertyOptional({
    enum: HousekeepingPriority,
