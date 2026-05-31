import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class GenerateInvoiceDto {
  @ApiProperty({
    example: 7,
    description: 'Folio to snapshot into an invoice.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  folioId!: number;
}
