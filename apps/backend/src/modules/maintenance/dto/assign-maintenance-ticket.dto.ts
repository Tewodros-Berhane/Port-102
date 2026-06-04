import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class AssignMaintenanceTicketDto {
  @ApiProperty({
    example: 9,
    minimum: 1,
    description: 'Active technician/user assigned to the ticket.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assignedToUserId!: number;

  @ApiPropertyOptional({
    example: 'Assigning to the HVAC technician on duty.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  notes?: string | null;
}
