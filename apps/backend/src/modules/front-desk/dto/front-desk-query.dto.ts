import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

class FrontDeskPaginatedQueryDto {
  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;

  @ApiPropertyOptional({
    example: 'Marta',
    description:
      'Search guest name, guest contact, reservation number, stay number, or room number where applicable.',
  })
  @IsString()
  @IsOptional()
  search?: string;
}

export class FrontDeskDashboardQueryDto {
  @ApiPropertyOptional({
    example: '2026-06-10',
    description:
      'Operational date for dashboard counts. Defaults to the server-local current date.',
  })
  @IsDateString()
  @IsOptional()
  date?: string;
}

export class FrontDeskArrivalsQueryDto extends FrontDeskPaginatedQueryDto {
  @ApiPropertyOptional({
    example: '2026-06-10',
