import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class AddPosOrderItemDto {
  @ApiProperty({ example: 7, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  menuItemId!: number;

  @ApiPropertyOptional({ example: 2, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity = 1;

  @ApiPropertyOptional({
    example: 'No raw onion.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string | null;
}
