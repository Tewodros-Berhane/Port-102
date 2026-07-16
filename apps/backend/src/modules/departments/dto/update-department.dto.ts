import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'FRONT_DESK' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  @IsOptional()
  key?: string;

  @ApiPropertyOptional({ example: 'Front Desk' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Whether the department is active and assignable.',
  })
  @Transform(({ value }: TransformFnParams): unknown => {
    const input: unknown = value;
    return input === 'true' ? true : input === 'false' ? false : input;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
