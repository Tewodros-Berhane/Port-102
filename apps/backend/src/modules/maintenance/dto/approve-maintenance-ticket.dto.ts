import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';

export class ApproveMaintenanceTicketDto {
  @ApiPropertyOptional({
    example: 'Repair verified by supervisor.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  approvalNotes?: string | null;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description:
      'When true, linked rooms under maintenance or out of order are cleared to available.',
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  clearMaintenance?: boolean;
}
