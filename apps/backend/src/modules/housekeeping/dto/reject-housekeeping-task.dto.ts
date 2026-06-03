import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class RejectHousekeepingTaskDto {
  @ApiProperty({
    example: 'Dust found on the desk and mirror needs cleaning.',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional({
    example: 'Reinspect after desk and mirror are corrected.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  inspectionNotes?: string | null;
}
