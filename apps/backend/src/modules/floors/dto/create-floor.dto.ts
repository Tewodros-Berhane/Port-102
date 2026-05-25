import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateFloorDto {
  @ApiProperty({
    example: 'First Floor',
    description: 'Human-readable floor name.',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Optional display/order number for the floor.',
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  number?: number;

  @ApiPropertyOptional({
    example: 'Main guest room floor above reception.',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
