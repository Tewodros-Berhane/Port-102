import { Module } from '@nestjs/common';

import { HotelAccessGuard } from '../../common/guards/hotel-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { ApprovalRequestsController } from './approval-requests.controller';
import { ApprovalRequestsService } from './approval-requests.service';
import { ApprovalRequestsRepository } from './repositories/approval-requests.repository';

@Module({
  imports: [PrismaModule],
  controllers: [ApprovalRequestsController],
  providers: [
    ApprovalRequestsService,
    ApprovalRequestsRepository,
    HotelAccessGuard,
    PermissionsGuard,
  ],
  exports: [ApprovalRequestsService, ApprovalRequestsRepository],
})
export class ApprovalRequestsModule {}
