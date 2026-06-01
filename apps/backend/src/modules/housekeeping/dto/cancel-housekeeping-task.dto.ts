import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelHousekeepingTaskDto {
  @ApiProperty({
    example: 'Guest extended stay; cleaning no longer needed today.',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
