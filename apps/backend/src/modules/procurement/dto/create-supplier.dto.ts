import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'SUP-0001', maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  supplierNumber!: string;

  @ApiProperty({ example: 'Addis Fresh Foods', maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'Hana Bekele', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({ example: '+251911111111', maxLength: 40 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'orders@example.com', maxLength: 160 })
  @IsEmail()
  @MaxLength(160)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Bole, Addis Ababa', maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Primary food supplier.', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @IsOptional()
  notes?: string;
}
