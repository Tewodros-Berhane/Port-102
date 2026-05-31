import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class VoidReceiptDto {
  @ApiProperty({
    example: 'Receipt issued against the wrong payment.',
  })
  @IsString()
  @MaxLength(500)
  voidReason!: string;
}
