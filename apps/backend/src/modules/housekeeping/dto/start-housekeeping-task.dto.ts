import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class StartHousekeepingTaskDto {
  @ApiPropertyOptional({
