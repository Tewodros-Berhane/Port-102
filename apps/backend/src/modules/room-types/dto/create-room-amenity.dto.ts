import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Matches, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoomAmenityDto {
  @ApiProperty({
    example: 'Wi-Fi',
    description: 'Human-readable amenity name.',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'wifi',
    description:
      'Stable machine-readable amenity key. It is normalized to lowercase.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  key!: string;

  @ApiPropertyOptional({
    example: 'High-speed wireless internet access.',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
