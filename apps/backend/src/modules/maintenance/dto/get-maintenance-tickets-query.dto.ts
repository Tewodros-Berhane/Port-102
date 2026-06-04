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
  MaintenanceIssueType,
  MaintenancePriority,
  MaintenanceTicketStatus,
} from '../../../generated/prisma/client';

export class GetMaintenanceTicketsQueryDto {
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
    example: 'AC',
    description: 'Search ticket number, title, description, room, or asset.',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: MaintenanceTicketStatus,
    example: MaintenanceTicketStatus.OPEN,
  })
  @IsEnum(MaintenanceTicketStatus)
  @IsOptional()
  status?: MaintenanceTicketStatus;

  @ApiPropertyOptional({
    enum: MaintenancePriority,
    example: MaintenancePriority.URGENT,
  })
  @IsEnum(MaintenancePriority)
  @IsOptional()
  priority?: MaintenancePriority;

  @ApiPropertyOptional({
    enum: MaintenanceIssueType,
    example: MaintenanceIssueType.HVAC,
  })
  @IsEnum(MaintenanceIssueType)
  @IsOptional()
  issueType?: MaintenanceIssueType;

  @ApiPropertyOptional({ example: 12, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  roomId?: number;

  @ApiPropertyOptional({ example: 4, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  assetId?: number;

  @ApiPropertyOptional({ example: 9, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  assignedToUserId?: number;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsDateString()
  @IsOptional()
  createdFrom?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsDateString()
  @IsOptional()
  createdTo?: string;
}
