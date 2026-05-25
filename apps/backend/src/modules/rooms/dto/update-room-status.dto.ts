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
