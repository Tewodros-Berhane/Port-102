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
  MaintenanceIssueType,
  MaintenancePriority,
  MaintenanceTicketSource,
} from '../../../generated/prisma/client';

export class CreateMaintenanceTicketDto {
  @ApiProperty({
    example: 'AC is leaking in room 204',
    description: 'Short human-readable issue title.',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({
    example: 'Guest reported water dripping from the ceiling cassette unit.',
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
    enum: MaintenanceTicketSource,
    example: MaintenanceTicketSource.MANUAL,
    default: MaintenanceTicketSource.MANUAL,
  })
  @IsEnum(MaintenanceTicketSource)
  @IsOptional()
  source?: MaintenanceTicketSource;

  @ApiPropertyOptional({
    example: 'FRONT_DESK_REPORT',
    nullable: true,
    description: 'Optional source system/type for traceability.',
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
    description: 'Optional source record ID for traceability.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  sourceId?: number | null;

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

  @ApiPropertyOptional({
    example: 9,
    minimum: 1,
    nullable: true,
    description: 'Optional active technician to assign immediately.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  assignedToUserId?: number | null;
}
