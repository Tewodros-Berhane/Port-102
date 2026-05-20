import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'opaque-refresh-token',
  })
  @IsString()
  @MinLength(32)
  refreshToken!: string;
}
