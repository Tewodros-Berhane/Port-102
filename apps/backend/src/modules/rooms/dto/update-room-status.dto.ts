import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import {
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
} from '../../../generated/prisma/client';

export class UpdateRoomStatusDto {
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
    example: 'Inspection completed after cleaning.',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
