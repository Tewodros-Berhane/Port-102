import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarkRoomOutOfOrderDto {
  @ApiPropertyOptional({
    example: 'Air conditioning repair required.',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
