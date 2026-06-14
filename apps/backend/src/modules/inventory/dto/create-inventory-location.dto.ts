import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateInventoryLocationDto {
  @ApiProperty({
    example: 'Main Store',
    description: 'Human-readable stock location name.',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: 'MAIN-STORE',
    description:
      'Unique location code. It is normalized to uppercase before storage.',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  code!: string;

  @ApiPropertyOptional({
    example: 'Primary receiving and issuing store.',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string | null;
}
