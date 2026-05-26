import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateReservationRoomDto {
  @ApiPropertyOptional({
    example: 2,
    description: 'Active room type to reserve.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  roomTypeId?: number;

  @ApiPropertyOptional({
    example: 101,
    description: 'Exact active room assignment, or null to clear assignment.',
    minimum: 1,
    nullable: true,
  })
