import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';

import configuration from './config/configuration';
import { ApprovalRequestsModule } from './modules/approval-requests/approval-requests.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { FloorsModule } from './modules/floors/floors.module';
import { GuestsModule } from './modules/guests/guests.module';
import { HealthModule } from './modules/health/health.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { RoomTypesModule } from './modules/room-types/room-types.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '../../.env'),
        join(process.cwd(), '.env.example'),
        join(process.cwd(), '../../.env.example'),
      ],
      load: [configuration],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    EmployeesModule,
    GuestsModule,
    ApprovalRequestsModule,
    AuditLogsModule,
    RolesModule,
    PermissionsModule,
    FloorsModule,
    RoomTypesModule,
  ],
})
export class AppModule {}
