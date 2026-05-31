import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { FolioStatus } from '../../../generated/prisma/client';

export class UpdateFolioDto {
  @ApiPropertyOptional({
    enum: FolioStatus,
    example: FolioStatus.OPEN,
    description:
      'Administrative folio status update. Close and void workflows enforce their own business rules.',
  })
  @IsEnum(FolioStatus)
  @IsOptional()
  status?: FolioStatus;
}
