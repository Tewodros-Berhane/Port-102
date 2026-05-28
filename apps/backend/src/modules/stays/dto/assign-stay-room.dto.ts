import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class AssignStayRoomDto {
  @ApiProperty({
    example: 101,
    description: 'Physical room to assign to the active stay.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId!: number;

  @ApiPropertyOptional({
    example: 24,
    description: 'Reservation room line this stay assignment fulfills.',
    minimum: 1,
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  reservationRoomId?: number | null;

  @ApiPropertyOptional({
    example: 'Guest requested an additional room for family.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  reason?: string | null;
}
