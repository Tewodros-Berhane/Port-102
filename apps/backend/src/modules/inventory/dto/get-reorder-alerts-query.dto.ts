import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetReorderAlertsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'rice' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: 4,
    minimum: 1,
    description: 'Optional location filter for location-level reorder checks.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  locationId?: number;
}
