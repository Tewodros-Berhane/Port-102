import { Module } from '@nestjs/common';

import { HotelAccessGuard } from '../../common/guards/hotel-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeesRepository } from './repositories/employees.repository';

@Module({
  imports: [PrismaModule],
  controllers: [EmployeesController],
  providers: [
    EmployeesService,
    EmployeesRepository,
    HotelAccessGuard,
    PermissionsGuard,
  ],
  exports: [EmployeesService, EmployeesRepository],
})
export class EmployeesModule {}
