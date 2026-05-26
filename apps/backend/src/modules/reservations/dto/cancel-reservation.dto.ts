import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelReservationDto {
  @ApiProperty({
    example: 'Guest called to cancel the trip.',
    description: 'Reason recorded with the cancellation audit trail.',
  })
  @IsString()
  @IsNotEmpty()
  cancellationReason!: string;
}
