import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectStockAdjustmentDto {
  @ApiProperty({
    example: 'Count sheet does not match the requested variance.',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  decisionNote!: string;
}
