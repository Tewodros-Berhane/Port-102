import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

import { OutletType } from '../../../generated/prisma/client';

export class UpdateOutletDto {
  @ApiPropertyOptional({ example: 'Main Restaurant' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'MAIN-RESTAURANT' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ enum: OutletType })
  @IsEnum(OutletType)
  @IsOptional()
  type?: OutletType;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the outlet can accept new POS orders.',
  })
  @Transform(({ value }: TransformFnParams): unknown => {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
