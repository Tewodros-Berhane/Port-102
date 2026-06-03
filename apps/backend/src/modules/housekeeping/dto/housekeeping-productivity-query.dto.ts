import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class HousekeepingProductivityQueryDto {
  @ApiPropertyOptional({
    example: '2026-06-01',
    description: 'Start date for productivity counts. Defaults to today.',
  })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-06-03',
    description: 'End date for productivity counts. Defaults to today.',
  })
  @IsDateString()
  @IsOptional()
  to?: string;
}
