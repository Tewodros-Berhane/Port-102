import { Global, Module } from '@nestjs/common';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './repositories/notifications.repository';
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository, PermissionsGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
