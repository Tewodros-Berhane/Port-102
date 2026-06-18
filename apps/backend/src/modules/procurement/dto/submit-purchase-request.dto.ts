import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitPurchaseRequestDto {
  @ApiPropertyOptional({ example: 'Ready for approval' })
  @IsOptional()
  @IsString()
  notes?: string;
}
