import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class CompleteHousekeepingTaskDto {
  @ApiPropertyOptional({
    example: 'Room cleaned and minibar checked.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
