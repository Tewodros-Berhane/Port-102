import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

import { PosOrderSource } from '../../../generated/prisma/client';

export class UpdatePosOrderDto {
  @ApiPropertyOptional({ enum: PosOrderSource })
  @IsEnum(PosOrderSource)
  @IsOptional()
  source?: PosOrderSource;

  @ApiPropertyOptional({ example: 'T-12', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(80)
  @IsOptional()
  tableNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string | null;
}
