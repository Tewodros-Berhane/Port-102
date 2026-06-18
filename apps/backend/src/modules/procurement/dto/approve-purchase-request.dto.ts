import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApprovePurchaseRequestDto {
  @ApiPropertyOptional({ example: 'Approved within monthly budget' })
  @IsOptional()
  @IsString()
  decisionNote?: string;
}
