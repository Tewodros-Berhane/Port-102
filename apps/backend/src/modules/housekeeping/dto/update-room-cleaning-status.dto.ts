import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

import { RoomCleaningStatus } from '../../../generated/prisma/client';

export class UpdateRoomCleaningStatusDto {
  @ApiProperty({
    enum: RoomCleaningStatus,
    example: RoomCleaningStatus.CLEAN,
  })
  @IsEnum(RoomCleaningStatus)
  cleaningStatus!: RoomCleaningStatus;

  @ApiPropertyOptional({
    example: 'Manual update after supervisor room check.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  reason?: string | null;
}
