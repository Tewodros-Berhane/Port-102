import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { FrontDeskController } from './front-desk.controller';
import { FrontDeskRepository } from './repositories/front-desk.repository';
import { FrontDeskService } from './front-desk.service';
