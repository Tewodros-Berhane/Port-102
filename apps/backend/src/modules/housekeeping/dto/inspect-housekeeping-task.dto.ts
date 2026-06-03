import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class InspectHousekeepingTaskDto {
  @ApiPropertyOptional({
    example: 'Bathroom and minibar checked.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  inspectionNotes?: string | null;
}
