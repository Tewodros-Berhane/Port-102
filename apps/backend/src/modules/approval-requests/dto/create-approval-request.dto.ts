import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

import { ApprovalRequestType } from '../../../generated/prisma/client';

export class CreateApprovalRequestDto {
  @IsEnum(ApprovalRequestType)
  type!: ApprovalRequestType;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
