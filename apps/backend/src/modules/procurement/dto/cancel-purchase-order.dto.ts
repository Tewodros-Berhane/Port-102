import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelPurchaseOrderDto {
  @ApiProperty({ example: 'Supplier cannot fulfill this order' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
