import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class IssueStockDto {
  @ApiProperty({ example: 7, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  itemId!: number;

  @ApiProperty({ example: 4, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  locationId!: number;

  @ApiProperty({ example: 10, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity!: number;

  @ApiPropertyOptional({
    example: 'DEPARTMENT',
    description: 'Optional recipient or source document type.',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @IsOptional()
  referenceType?: string;

  @ApiPropertyOptional({
    example: 6,
    description: 'Optional department, outlet, or source document identifier.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  referenceId?: number;

  @ApiPropertyOptional({
    example: 'Issued to the main kitchen.',
    maxLength: 300,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    example: 'Requested by the kitchen supervisor.',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}
