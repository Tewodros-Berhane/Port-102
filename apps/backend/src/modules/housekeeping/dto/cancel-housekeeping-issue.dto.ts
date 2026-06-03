import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelHousekeepingIssueDto {
  @ApiProperty({
    example: 'Duplicate report; issue already tracked.',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
