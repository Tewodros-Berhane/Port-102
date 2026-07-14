import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import {
  PaymentMethod,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
} from '../../../generated/prisma/client';

export enum ReportGroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class ReportDateRangeQueryDto {
  @ApiPropertyOptional({
    example: '2026-07-01',
    description: 'Inclusive ISO date or date-time.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-07-31',
    description: 'Inclusive ISO date or date-time.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class GroupedReportQueryDto extends ReportDateRangeQueryDto {
  @ApiPropertyOptional({ enum: ReportGroupBy, default: ReportGroupBy.DAY })
  @IsOptional()
  @IsEnum(ReportGroupBy)
  groupBy?: ReportGroupBy;
}

export class ExecutiveDashboardQueryDto extends ReportDateRangeQueryDto {}
export class DailySummaryQueryDto extends ReportDateRangeQueryDto {}
export class OccupancyReportQueryDto extends GroupedReportQueryDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomTypeId?: number;
}

export class ArrivalsDeparturesQueryDto extends ReportDateRangeQueryDto {}

export class RoomStatusReportQueryDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  floorId?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomTypeId?: number;

  @ApiPropertyOptional({ enum: RoomOccupancyStatus })
  @IsOptional()
  @IsEnum(RoomOccupancyStatus)
  occupancyStatus?: RoomOccupancyStatus;

  @ApiPropertyOptional({ enum: RoomCleaningStatus })
  @IsOptional()
  @IsEnum(RoomCleaningStatus)
  cleaningStatus?: RoomCleaningStatus;

  @ApiPropertyOptional({ enum: RoomMaintenanceStatus })
  @IsOptional()
  @IsEnum(RoomMaintenanceStatus)
  maintenanceStatus?: RoomMaintenanceStatus;
}

export class RevenueReportQueryDto extends GroupedReportQueryDto {}

export class PaymentSummaryQueryDto extends GroupedReportQueryDto {
  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

export class OutletSalesReportQueryDto extends GroupedReportQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  outletId?: number;
}

export class DepartmentPerformanceQueryDto extends ReportDateRangeQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  departmentId?: number;
}

export class OperationsExceptionsQueryDto {
  @ApiPropertyOptional({ default: 24, minimum: 1, maximum: 168 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  overdueHours?: number;
}

export class InventoryReportQueryDto extends ReportDateRangeQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  locationId?: number;
}

export class ProcurementReportQueryDto extends ReportDateRangeQueryDto {}
