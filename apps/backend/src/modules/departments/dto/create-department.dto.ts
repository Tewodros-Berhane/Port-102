import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({
    example: 'FRONT_DESK',
    description: 'Stable unique department key.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  key!: string;

  @ApiProperty({ example: 'Front Desk' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Reception and guest arrival operations.' })
  @IsString()
  @IsOptional()
  description?: string;
}
