import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class ResolveHousekeepingIssueDto {
  @ApiPropertyOptional({
    example: 'Lamp was replaced and verified by supervisor.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  resolutionNotes?: string | null;
}
