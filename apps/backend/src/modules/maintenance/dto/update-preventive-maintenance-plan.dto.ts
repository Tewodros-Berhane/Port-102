import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

import { PreventiveMaintenanceStatus } from '../../../generated/prisma/client';

export class UpdatePreventiveMaintenancePlanDto {
  @ApiPropertyOptional({ example: 'Quarterly AC service' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ example: 4, minimum: 1, nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  assetId?: number | null;

  @ApiPropertyOptional({ example: 12, minimum: 1, nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  roomId?: number | null;

  @ApiPropertyOptional({ example: 90, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  intervalDays?: number;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsDateString()
  @IsOptional()
  nextDueDate?: string;

  @ApiPropertyOptional({
    enum: PreventiveMaintenanceStatus,
    example: PreventiveMaintenanceStatus.ACTIVE,
  })
  @IsEnum(PreventiveMaintenanceStatus)
  @IsOptional()
  status?: PreventiveMaintenanceStatus;
}
