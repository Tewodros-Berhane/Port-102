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
  MaintenanceIssueType,
  MaintenancePriority,
} from '../../../generated/prisma/client';

export class UpdateMaintenanceTicketDto {
  @ApiPropertyOptional({
    example: 'AC is leaking in room 204',
    description: 'Updated short human-readable issue title.',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'Technician confirmed leak is from the drain line.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({
    example: 12,
    minimum: 1,
    nullable: true,
    description: 'Optional active room linked to this ticket.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  roomId?: number | null;

  @ApiPropertyOptional({
    example: 4,
    minimum: 1,
    nullable: true,
    description: 'Optional active asset linked to this ticket.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  assetId?: number | null;

  @ApiPropertyOptional({
    enum: MaintenanceIssueType,
    example: MaintenanceIssueType.HVAC,
  })
  @IsEnum(MaintenanceIssueType)
  @IsOptional()
  issueType?: MaintenanceIssueType;

  @ApiPropertyOptional({
    enum: MaintenancePriority,
    example: MaintenancePriority.HIGH,
  })
  @IsEnum(MaintenancePriority)
  @IsOptional()
  priority?: MaintenancePriority;
}
