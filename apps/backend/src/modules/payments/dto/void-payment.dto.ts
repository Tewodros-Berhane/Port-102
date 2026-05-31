import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class VoidPaymentDto {
  @ApiProperty({
    example: 'Duplicate payment entry.',
    description: 'Reason shown in billing audit history.',
  })
  @IsString()
  @MaxLength(500)
  voidReason!: string;
}
