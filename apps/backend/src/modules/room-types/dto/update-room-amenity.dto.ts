import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

export class UpdateRoomAmenityDto {
  @ApiPropertyOptional({
    example: 'Wi-Fi',
    description: 'Human-readable amenity name.',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'wifi',
    description:
      'Stable machine-readable amenity key. It is normalized to lowercase.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  @IsOptional()
  key?: string;

  @ApiPropertyOptional({
    example: 'High-speed wireless internet access.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the amenity can be assigned to room types.',
  })
  @Transform(({ value }) => {
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
