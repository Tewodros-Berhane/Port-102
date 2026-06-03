import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class ApproveHousekeepingTaskDto {
  @ApiPropertyOptional({
    example: 'Room passed supervisor inspection.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  inspectionNotes?: string | null;
}
