import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelGoodsReceivedDto {
  @ApiProperty({ example: 'Created against the wrong purchase order' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
