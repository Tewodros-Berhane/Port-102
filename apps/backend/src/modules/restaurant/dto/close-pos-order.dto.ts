import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ClosePosOrderDto {
  @ApiPropertyOptional({
    example: 'Payment verified by cashier.',
    description: 'Optional operational note stored on the closed order.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
