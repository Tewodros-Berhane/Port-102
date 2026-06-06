import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

import {
  MaintenanceIssueType,
  MaintenancePriority,
} from '../../../generated/prisma/client';

export class CreateTicketFromPreventivePlanDto {
  @ApiPropertyOptional({
    enum: MaintenanceIssueType,
    example: MaintenanceIssueType.HVAC,
    default: MaintenanceIssueType.OTHER,
  })
  @IsEnum(MaintenanceIssueType)
  @IsOptional()
  issueType?: MaintenanceIssueType;

  @ApiPropertyOptional({
    enum: MaintenancePriority,
    example: MaintenancePriority.NORMAL,
    default: MaintenancePriority.NORMAL,
  })
  @IsEnum(MaintenancePriority)
  @IsOptional()
  priority?: MaintenancePriority;

  @ApiPropertyOptional({ example: 9, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  assignedToUserId?: number;
}
