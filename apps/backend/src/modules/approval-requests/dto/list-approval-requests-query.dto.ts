import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import {
  ApprovalRequestType,
  ApprovalStatus,
} from '../../../generated/prisma/client';

export class ListApprovalRequestsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsEnum(ApprovalStatus)
  @IsOptional()
  status?: ApprovalStatus;

  @IsEnum(ApprovalRequestType)
  @IsOptional()
  type?: ApprovalRequestType;
}
