import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MarkPurchaseOrderOrderedDto {
  @ApiPropertyOptional({ example: '2026-06-20T08:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  orderedAt?: string;

  @ApiPropertyOptional({ example: 'Supplier confirmed dispatch' })
  @IsOptional()
  @IsString()
  notes?: string;
}
