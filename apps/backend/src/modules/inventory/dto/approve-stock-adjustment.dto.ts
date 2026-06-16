import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveStockAdjustmentDto {
  @ApiPropertyOptional({
    example: 'Approved after recount by store supervisor.',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @IsOptional()
  decisionNote?: string;
}
