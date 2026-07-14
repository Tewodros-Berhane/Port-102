import { ApiPropertyOptional } from '@nestjs/swagger';
import { DateTime } from 'luxon';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  registerDecorator,
} from 'class-validator';

function IsIanaTimezone() {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isIanaTimezone',
      target: object.constructor,
      propertyName,
      options: { message: 'timezone must be a valid IANA timezone' },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && DateTime.local().setZone(value).isValid,
      },
    });
}

export class UpdatePropertySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxIdentification?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() registrationNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() alternatePhone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine1?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine2?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional({ example: 'Africa/Addis_Ababa' })
  @IsOptional()
  @IsIanaTimezone()
  timezone?: string;
  @ApiPropertyOptional({ example: 'ETB' })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  defaultCurrency?: string;
  @ApiPropertyOptional({ example: 'en-ET' })
  @IsOptional()
  @Matches(/^[a-z]{2,3}(?:-[A-Z]{2})?$/)
  locale?: string;
  @ApiPropertyOptional({ example: '14:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  checkInTime?: string;
  @ApiPropertyOptional({ example: '11:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  checkOutTime?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiptFooter?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceFooter?: string;
  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  defaultTaxRate?: number;
  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  defaultServiceChargeRate?: number;
}
