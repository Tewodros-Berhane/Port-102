import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class UpdateStayRoomAssignmentDto {
  @ApiPropertyOptional({
    example: 104,
    description:
      'Optional destination room. Prefer the room-move endpoint for guest moves.',
    minimum: 1,
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  roomId?: number | null;

  @ApiPropertyOptional({
    example: 'Corrected assignment note at front desk.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  reason?: string | null;
}
