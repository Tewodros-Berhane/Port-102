import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelPurchaseRequestDto {
  @ApiProperty({ example: 'Department no longer needs these items' })
  @IsString()
  @IsNotEmpty()
  decisionNote: string;
}
