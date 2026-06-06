import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';

export class UploadMaintenanceTicketPhotoDto {
  @ApiProperty({
    example: 'https://files.example.com/maintenance/ticket-30-leak.jpg',
    description: 'URL of the previously uploaded maintenance photo.',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({
    example: 'Leak visible below the indoor AC unit.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  description?: string | null;
}
