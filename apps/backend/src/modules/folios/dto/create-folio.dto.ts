import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateFolioDto {
  @ApiProperty({
    example: 40,
    description: 'Active stay that owns the folio.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stayId!: number;

  @ApiPropertyOptional({
    example: 12,
    description:
      'Guest expected on the folio. If provided, it must match the stay guest.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  guestId?: number;
}
