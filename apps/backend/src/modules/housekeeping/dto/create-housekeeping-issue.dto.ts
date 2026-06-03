import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateHousekeepingIssueDto {
  @ApiProperty({ example: 12, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId!: number;

  @ApiPropertyOptional({ example: 9, minimum: 1, nullable: true })
  @Type(() => Number)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  @Min(1)
  @IsOptional()
  taskId?: number | null;

  @ApiProperty({
    example: 'Broken bedside lamp',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({
    example: 'Lamp does not turn on after replacing bulb.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/housekeeping/issues/lamp.jpg',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  photoUrl?: string | null;
}
