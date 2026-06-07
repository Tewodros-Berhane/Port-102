import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

import { OutletType } from '../../../generated/prisma/client';

export class CreateOutletDto {
  @ApiProperty({
    example: 'Main Restaurant',
    description: 'Human-readable outlet name.',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'MAIN-RESTAURANT',
    description:
      'Unique outlet code. It is normalized to uppercase before storage.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  code!: string;

  @ApiProperty({
    enum: OutletType,
    example: OutletType.RESTAURANT,
  })
  @IsEnum(OutletType)
  type!: OutletType;

  @ApiPropertyOptional({
    example: 'Primary restaurant serving breakfast, lunch, and dinner.',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
