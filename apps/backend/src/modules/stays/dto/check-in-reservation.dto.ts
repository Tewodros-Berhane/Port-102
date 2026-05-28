import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CheckInRoomAssignmentDto {
  @ApiPropertyOptional({
    example: 24,
    description: 'Reservation room line being assigned at check-in.',
    minimum: 1,
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  reservationRoomId?: number | null;

  @ApiProperty({
    example: 101,
    description: 'Physical room to occupy for this reservation room.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId!: number;
}

export class CheckInReservationDto {
  @ApiPropertyOptional({
    type: [CheckInRoomAssignmentDto],
    description:
      'Optional physical room overrides. If omitted, existing reservation room assignments are used.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckInRoomAssignmentDto)
  @IsOptional()
  roomAssignments?: CheckInRoomAssignmentDto[];

  @ApiPropertyOptional({
    example: 'Guest arrived early and received verified ID at front desk.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  notes?: string | null;
}
