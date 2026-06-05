import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelMaintenanceTicketDto {
  @ApiProperty({
    example: 'Duplicate ticket created for the same issue.',
    description: 'Required cancellation reason.',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
