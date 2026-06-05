import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class RejectMaintenanceTicketDto {
  @ApiProperty({
    example: 'The AC still leaks after testing.',
    description: 'Required supervisor rejection reason.',
  })
  @IsString()
  @IsNotEmpty()
  rejectionReason!: string;

  @ApiPropertyOptional({
    example: 'Technician should inspect the condensate pump next.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  notes?: string | null;
}
