import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ClearRoomOutOfOrderDto {
  @ApiPropertyOptional({
    example: 'Maintenance completed and room released.',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
