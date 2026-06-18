import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PostGoodsReceivedDto {
  @ApiPropertyOptional({ example: 'Verified against delivery note' })
  @IsOptional()
  @IsString()
  notes?: string;
}
