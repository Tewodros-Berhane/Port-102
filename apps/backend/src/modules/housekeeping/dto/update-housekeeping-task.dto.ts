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
  @IsOptional()
  roomId?: number;

  @ApiPropertyOptional({
    enum: HousekeepingTaskType,
    example: HousekeepingTaskType.DEEP_CLEANING,
  })
  @IsEnum(HousekeepingTaskType)
  @IsOptional()
  type?: HousekeepingTaskType;

  @ApiPropertyOptional({
    enum: HousekeepingPriority,
    example: HousekeepingPriority.HIGH,
  })
  @IsEnum(HousekeepingPriority)
  @IsOptional()
  priority?: HousekeepingPriority;

  @ApiPropertyOptional({
    example: 'Prioritize before VIP arrival.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  notes?: string | null;

  @ApiPropertyOptional({
    example: 'MANUAL_REQUEST',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sourceType?: string | null;

  @ApiPropertyOptional({
    example: 42,
    minimum: 1,
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  sourceId?: number | null;
}
