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
import { RoomsModule } from './modules/rooms/rooms.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { StaysModule } from './modules/stays/stays.module';
import { FrontDeskModule } from './modules/front-desk/front-desk.module';
import { FoliosModule } from './modules/folios/folios.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { HousekeepingModule } from './modules/housekeeping/housekeeping.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PropertySettingsModule } from './modules/property-settings/property-settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DepartmentsModule } from './modules/departments/departments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '.env'),
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
    RoomsModule,
    ReservationsModule,
    StaysModule,
    FrontDeskModule,
    FoliosModule,
    PaymentsModule,
    InvoicesModule,
    HousekeepingModule,
    MaintenanceModule,
    RestaurantModule,
    InventoryModule,
    ProcurementModule,
    ReportsModule,
    PropertySettingsModule,
    NotificationsModule,
    DepartmentsModule,
  ],
})
export class AppModule {}
