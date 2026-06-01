import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class StartHousekeepingTaskDto {
  @ApiPropertyOptional({
    example: 'Started after guest departure was confirmed.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
