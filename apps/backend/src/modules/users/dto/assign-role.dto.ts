import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class AssignRoleDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  departmentId?: number | null;
}
