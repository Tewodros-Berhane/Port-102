import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';

export class StartMaintenanceTicketDto {
  @ApiPropertyOptional({
    example: 'Started after isolating the AC drain line.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  notes?: string | null;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description:
      'When true, linked available rooms are marked under maintenance.',
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  markRoomUnderMaintenance?: boolean;
}
