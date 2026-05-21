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

export class CreateEmployeeDto {
  @IsString()
  @IsOptional()
  employeeNumber?: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  jobTitle?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  departmentId?: number | null;

  @IsDateString()
  @IsOptional()
  hireDate?: string | null;
}
