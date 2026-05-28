import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CheckOutStayDto {
  @ApiPropertyOptional({
    example: 'Guest checked out from front desk.',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  notes?: string | null;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'Reserved for later permission-protected override flows. Normal checkout should omit this.',
  })
  @IsBoolean()
  @IsOptional()
  forceCheckout?: boolean;
}
