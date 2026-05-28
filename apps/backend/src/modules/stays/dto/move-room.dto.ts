import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class MoveRoomDto {
  @ApiProperty({
    example: 31,
    description: 'Active room assignment being released.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fromAssignmentId!: number;

  @ApiProperty({
    example: 104,
    description: 'Vacant destination room for the active stay.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  toRoomId!: number;

  @ApiPropertyOptional({
    example: 'Guest requested a quieter room.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  reason?: string | null;
}
