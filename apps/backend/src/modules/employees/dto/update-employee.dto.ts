import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  employeeNumber?: string | null;

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
  jobTitle?: string | null;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  departmentId?: number | null;

  @IsDateString()
  @IsOptional()
  hireDate?: string | null;
}
