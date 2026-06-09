import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class ChargePosOrderToRoomDto {
  @ApiProperty({
    example: 42,
    description: 'Active hotel stay whose open folio receives the POS charge.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stayId: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Close the POS order after posting the charge to the folio.',
  })
  @IsOptional()
  @IsBoolean()
  closeOrder?: boolean = true;
}
