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
    example: HousekeepingTaskType.MANUAL,
    default: HousekeepingTaskType.CHECKOUT_CLEANING,
  })
  @IsEnum(HousekeepingTaskType)
  @IsOptional()
  type?: HousekeepingTaskType;

  @ApiPropertyOptional({
    enum: HousekeepingPriority,
    example: HousekeepingPriority.NORMAL,
    default: HousekeepingPriority.NORMAL,
  })
  @IsEnum(HousekeepingPriority)
  @IsOptional()
  priority?: HousekeepingPriority;

  @ApiPropertyOptional({
    example: 7,
    minimum: 1,
    description: 'Optional active user to assign immediately.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  assignedToUserId?: number;

  @ApiPropertyOptional({
    example: 'Guest requested extra towels after cleaning.',
    nullable: true,
