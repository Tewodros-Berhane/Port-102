import { IsOptional, IsString } from 'class-validator';

export class DecideApprovalRequestDto {
  @IsString()
  @IsOptional()
  decisionNote?: string;
}
