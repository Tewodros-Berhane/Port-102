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
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  roomId?: number | null;

  @ApiPropertyOptional({
    example: 125.5,
    description: 'Optional nightly rate override for this reserved room.',
    minimum: 0,
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  rate?: number | null;

  @ApiPropertyOptional({
    example: 'Guest prefers this room near the elevator.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  notes?: string | null;
}
