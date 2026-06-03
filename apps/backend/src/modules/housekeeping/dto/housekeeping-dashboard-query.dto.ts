import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class HousekeepingDashboardQueryDto {
  @ApiPropertyOptional({
    example: '2026-06-03',
    description: 'Dashboard business date. Defaults to today.',
  })
  @IsDateString()
  @IsOptional()
  date?: string;
}
