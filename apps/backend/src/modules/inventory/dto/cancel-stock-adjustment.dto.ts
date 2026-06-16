import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelStockAdjustmentDto {
  @ApiProperty({
    example: 'Adjustment request was entered twice.',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  decisionNote!: string;
}
