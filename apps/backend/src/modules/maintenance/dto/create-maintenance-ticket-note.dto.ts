import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMaintenanceTicketNoteDto {
  @ApiProperty({
    example: 'Drain line is blocked near the condensate pump.',
    description: 'Maintenance progress or diagnostic note.',
  })
  @IsString()
  @IsNotEmpty()
  note!: string;
}
