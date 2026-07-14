import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import { REQUIRED_PERMISSIONS_KEY } from '../src/common/decorators/permissions.decorator';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { ReportsService } from '../src/modules/reports/reports.service';

const reportUser = {
  sub: 1,
  email: 'manager@port102.test',
  roleKey: 'GENERAL_MANAGER',
  roleId: 3,
  departmentId: null,
  tokenVersion: 0,
  permissions: [
    'reports.dashboard.read',
    'reports.daily_summary.read',
    'reports.occupancy.read',
    'reports.arrivals_departures.read',
    'reports.room_status.read',
    'reports.revenue.read',
    'reports.payment_summary.read',
    'reports.department_performance.read',
    'reports.housekeeping.read',
    'reports.maintenance.read',
    'reports.outlet_sales.read',
    'reports.inventory.read',
    'reports.procurement.read',
  ],
};

describe('Reports API (e2e)', () => {
  let app: INestApplication;
  const response = {
    dateRange: { from: '2026-07-01', to: '2026-07-31' },
    total: '10.00',
  };
  const reportsService = {
    getDashboard: jest.fn().mockResolvedValue(response),
    getDailySummary: jest.fn().mockResolvedValue(response),
    getExceptions: jest.fn().mockResolvedValue(response),
    getOccupancy: jest.fn().mockResolvedValue(response),
    getArrivalsDepartures: jest.fn().mockResolvedValue(response),
    getRoomStatus: jest.fn().mockResolvedValue(response),
    getRevenue: jest.fn().mockResolvedValue(response),
    getPayments: jest.fn().mockResolvedValue(response),
    getDepartmentPerformance: jest.fn().mockResolvedValue(response),
    getHousekeeping: jest.fn().mockResolvedValue(response),
    getMaintenance: jest.fn().mockResolvedValue(response),
    getOutletSales: jest.fn().mockResolvedValue(response),
    getInventory: jest.fn().mockResolvedValue(response),
    getProcurement: jest.fn().mockResolvedValue(response),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ReportsService)
      .useValue(reportsService)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const request = context.switchToHttp().getRequest<{
            headers: { authorization?: string };
            user?: typeof reportUser;
          }>();
          if (request.headers.authorization !== 'Bearer report-token')
            throw new UnauthorizedException();
          request.user = reportUser;
          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const required =
            (Reflect.getMetadata(
              REQUIRED_PERMISSIONS_KEY,
              context.getHandler(),
            ) as string[] | undefined) ?? [];
          return required.every((permission) =>
            reportUser.permissions.includes(permission),
          );
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => app.close());

  it('rejects unauthenticated report requests', async () => {
    await request(app.getHttpServer())
      .get('/api/reports/dashboard')
      .expect(401);
  });

  it('validates date and grouping query values', async () => {
    await request(app.getHttpServer())
      .get('/api/reports/revenue?from=invalid&groupBy=quarter')
      .set('Authorization', 'Bearer report-token')
      .expect(400);
  });

  it.each([
    '/api/reports/dashboard',
    '/api/reports/daily-summary',
    '/api/reports/exceptions',
    '/api/reports/occupancy',
    '/api/reports/arrivals-departures',
    '/api/reports/room-status',
    '/api/reports/revenue',
    '/api/reports/payments',
    '/api/reports/department-performance',
    '/api/reports/housekeeping',
    '/api/reports/maintenance',
    '/api/reports/outlet-sales',
    '/api/reports/inventory',
    '/api/reports/procurement',
  ])('serves the protected report endpoint %s', async (path) => {
    const result = await request(app.getHttpServer())
      .get(path)
      .set('Authorization', 'Bearer report-token')
      .expect(200);
    const body = result.body as { data: typeof response };
    expect(body.data).toEqual(response);
  });
});
