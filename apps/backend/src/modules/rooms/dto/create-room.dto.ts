import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({
    example: '101',
    description: 'Unique room number or label used by operations.',
  })
  @IsString()
  @IsNotEmpty()
  roomNumber!: string;

  @ApiPropertyOptional({
    example: 'Deluxe King 101',
    description: 'Optional guest-facing display name.',
  })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Active floor ID. Omit when a room is not assigned to a floor.',
    minimum: 1,
    nullable: true,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  floorId?: number | null;

  @ApiProperty({
    example: 2,
    description: 'Active room type ID.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomTypeId!: number;

  @ApiPropertyOptional({
    example: 'Near the elevator.',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
