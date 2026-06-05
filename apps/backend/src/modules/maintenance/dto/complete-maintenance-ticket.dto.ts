import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class CompleteMaintenanceTicketDto {
  @ApiPropertyOptional({
    example: 'Drain line cleaned and AC tested for 20 minutes.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  completionNotes?: string | null;
}
