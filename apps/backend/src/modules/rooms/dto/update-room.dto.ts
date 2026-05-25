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
