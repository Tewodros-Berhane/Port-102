import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class MarkRoomOutOfOrderFromMaintenanceDto {
  @ApiPropertyOptional({
    example: 'Water leak requires room to be blocked from sale.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  reason?: string | null;
}
