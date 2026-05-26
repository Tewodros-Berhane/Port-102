import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class AddReservationRoomDto {
  @ApiProperty({
    example: 2,
    description: 'Active room type to reserve.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomTypeId!: number;

  @ApiPropertyOptional({
    example: 101,
    description:
      'Optional exact active room assignment. Omit to reserve by room type.',
    minimum: 1,
    nullable: true,
  })
