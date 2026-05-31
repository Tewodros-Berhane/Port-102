import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class VoidInvoiceDto {
  @ApiProperty({
    example: 'Invoice regenerated with corrected folio totals.',
  })
  @IsString()
  @MaxLength(500)
  voidReason!: string;
}
