import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class ExtendStayDto {
  @ApiProperty({
    example: '2026-06-15',
    description:
      'New expected checkout date. It must be after the current date.',
  })
  @IsDateString()
  newExpectedCheckOutDate!: string;

  @ApiPropertyOptional({
    example: 'Guest requested one additional night.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  reason?: string | null;
}
