import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApprovePurchaseOrderDto {
  @ApiPropertyOptional({ example: 'Approved for ordering' })
  @IsOptional()
  @IsString()
  notes?: string;
}
