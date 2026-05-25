import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateRoomDto {
  @ApiPropertyOptional({
    example: '101',
    description: 'Unique room number or label used by operations.',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  roomNumber?: string;

  @ApiPropertyOptional({
    example: 'Deluxe King 101',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  displayName?: string | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Active floor ID, or null to clear the room floor.',
    minimum: 1,
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  floorId?: number | null;

  @ApiPropertyOptional({
    example: 2,
    description: 'Active room type ID.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  roomTypeId?: number;

  @ApiPropertyOptional({
    example: 'Near the elevator.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  notes?: string | null;
}
