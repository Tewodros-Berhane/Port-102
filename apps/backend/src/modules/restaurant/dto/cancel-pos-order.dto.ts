import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelPosOrderDto {
  @ApiProperty({
    example: 'Guest cancelled before preparation.',
    description: 'Required reason retained with the cancelled POS order.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
