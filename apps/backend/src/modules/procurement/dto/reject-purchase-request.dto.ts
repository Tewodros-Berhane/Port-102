import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectPurchaseRequestDto {
  @ApiProperty({ example: 'Duplicate request already approved' })
  @IsString()
  @IsNotEmpty()
  decisionNote: string;
}
