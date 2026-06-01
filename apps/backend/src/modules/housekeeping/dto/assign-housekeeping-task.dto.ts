import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class AssignHousekeepingTaskDto {
  @ApiProperty({
    example: 7,
    minimum: 1,
