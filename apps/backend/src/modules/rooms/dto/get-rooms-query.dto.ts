import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import {
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
} from '../../../generated/prisma/client';

export class GetRoomsQueryDto {
  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;

  @ApiPropertyOptional({
    example: '101',
    description: 'Search by room number, display name, notes, or room type.',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  floorId?: number;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  roomTypeId?: number;

  @ApiPropertyOptional({
    enum: RoomOccupancyStatus,
    example: RoomOccupancyStatus.VACANT,
  })
  @IsEnum(RoomOccupancyStatus)
  @IsOptional()
  occupancyStatus?: RoomOccupancyStatus;

  @ApiPropertyOptional({
    enum: RoomCleaningStatus,
    example: RoomCleaningStatus.CLEAN,
  })
  @IsEnum(RoomCleaningStatus)
  @IsOptional()
  cleaningStatus?: RoomCleaningStatus;

  @ApiPropertyOptional({
    enum: RoomMaintenanceStatus,
    example: RoomMaintenanceStatus.AVAILABLE,
  })
  @IsEnum(RoomMaintenanceStatus)
  @IsOptional()
  maintenanceStatus?: RoomMaintenanceStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter rooms by active state.',
  })
  @Transform(({ value }) => {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
