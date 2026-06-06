import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

import { AssetStatus } from '../../../generated/prisma/client';

export class CreateAssetDto {
  @ApiProperty({
    example: 'AST-HVAC-0004',
    description: 'Unique asset identifier.',
  })
  @IsString()
  @IsNotEmpty()
  assetNumber!: string;

  @ApiProperty({
    example: 'Room 204 air conditioner',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'HVAC', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  category?: string | null;

  @ApiPropertyOptional({ example: 'Room 204', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  location?: string | null;

  @ApiPropertyOptional({
    example: 12,
    minimum: 1,
    nullable: true,
    description: 'Optional active room containing the asset.',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  roomId?: number | null;

  @ApiPropertyOptional({
    enum: AssetStatus,
    example: AssetStatus.ACTIVE,
    default: AssetStatus.ACTIVE,
  })
  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus;

  @ApiPropertyOptional({
    example: 'Ceiling cassette unit serving room 204.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ example: '2024-05-20', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString()
  @IsOptional()
  purchaseDate?: string | null;

  @ApiPropertyOptional({ example: '2027-05-20', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString()
  @IsOptional()
  warrantyUntil?: string | null;
}
