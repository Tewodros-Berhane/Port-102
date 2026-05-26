import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarkNoShowDto {
  @ApiPropertyOptional({
    example: 'Guest did not arrive before night audit.',
    description: 'Optional note stored in audit metadata.',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
