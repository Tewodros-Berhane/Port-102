import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class VoidFolioLineItemDto {
  @ApiProperty({
    example: 'Charge posted to the wrong guest folio.',
    description: 'Reason shown in billing audit history.',
  })
  @IsString()
  @MaxLength(500)
  voidReason!: string;
}
