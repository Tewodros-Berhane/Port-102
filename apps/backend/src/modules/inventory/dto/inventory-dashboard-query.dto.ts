import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class InventoryDashboardQueryDto {
  @ApiPropertyOptional({
    example: 4,
    minimum: 1,
    description: 'Optional location filter for low-stock and value summaries.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  locationId?: number;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 25,
    default: 10,
    description: 'Number of recent stock movements to include.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  @IsOptional()
  recentMovementsLimit?: number = 10;
}
