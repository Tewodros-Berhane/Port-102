import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreatePreventiveMaintenancePlanDto {
  @ApiProperty({
    example: 'Quarterly AC service',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({
    example: 'Inspect filters, drain line, refrigerant, and electrical load.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({
    example: 4,
    minimum: 1,
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  assetId?: number | null;

  @ApiPropertyOptional({
    example: 12,
    minimum: 1,
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  roomId?: number | null;

  @ApiProperty({
    example: 90,
    minimum: 1,
    description: 'Number of days between scheduled maintenance events.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  intervalDays!: number;

  @ApiProperty({
    example: '2026-09-01',
  })
  @IsDateString()
  nextDueDate!: string;
}
