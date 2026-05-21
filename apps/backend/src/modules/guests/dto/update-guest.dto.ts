import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateGuestDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string | null;

  @IsString()
  @IsOptional()
  phone?: string | null;

  @IsString()
  @IsOptional()
  nationality?: string | null;

  @IsString()
  @IsOptional()
  documentNumber?: string | null;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsObject()
  @IsOptional()
  preferences?: Record<string, unknown> | null;
}
