import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9_]+$/)
  key!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  permissionKeys?: string[];
}
