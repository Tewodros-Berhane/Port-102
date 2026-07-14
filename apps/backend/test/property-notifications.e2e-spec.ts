import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { PropertySettingsService } from '../src/modules/property-settings/property-settings.service';
describe('Property settings and notifications API (e2e)', () => {
  let app: INestApplication;
  const user = {
    sub: 7,
    email: 'manager@test',
    roleKey: 'GENERAL_MANAGER',
    roleId: 1,
    tokenVersion: 0,
  };
  const property = {
    id: 1,
    name: 'Port-102',
    timezone: 'Africa/Addis_Ababa',
    defaultCurrency: 'ETB',
    locale: 'en-ET',
  };
  const propertyService = {
    get: jest.fn().mockResolvedValue(property),
    update: jest.fn().mockResolvedValue(property),
  };
  const notificationService = {
    list: jest
      .fn()
      .mockResolvedValue({ data: [{ id: 1, userId: 7 }], meta: {} }),
    unreadCount: jest.fn().mockResolvedValue({ count: 1 }),
    get: jest.fn().mockResolvedValue({ id: 1, userId: 7 }),
    markRead: jest.fn().mockResolvedValue({ id: 1, status: 'READ' }),
    readAll: jest.fn().mockResolvedValue({ count: 1 }),
    archive: jest.fn(),
    remove: jest.fn(),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PropertySettingsService)
      .useValue(propertyService)
      .overrideProvider(NotificationsService)
      .useValue(notificationService)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            headers: { authorization?: string };
            user?: typeof user;
          }>();
          if (req.headers.authorization !== 'Bearer test')
            throw new UnauthorizedException();
          req.user = user;
          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
  });
  afterAll(async () => app.close());
  it('requires authentication', () =>
    request(app.getHttpServer()).get('/api/notifications').expect(401));
  it('gets singleton settings', async () => {
    const r = await request(app.getHttpServer())
      .get('/api/property-settings')
      .set('Authorization', 'Bearer test')
      .expect(200);
    const body = r.body as { data: typeof property };
    expect(body.data).toEqual(property);
  });
  it('validates property timezone and currency', () =>
    request(app.getHttpServer())
      .patch('/api/property-settings')
      .set('Authorization', 'Bearer test')
      .send({ timezone: 'Not/AZone', defaultCurrency: 'etb' })
      .expect(400));
  it('updates settings', () =>
    request(app.getHttpServer())
      .patch('/api/property-settings')
      .set('Authorization', 'Bearer test')
      .send({ timezone: 'Africa/Addis_Ababa' })
      .expect(200));
  it('lists only through current user identity', async () => {
    await request(app.getHttpServer())
      .get('/api/notifications')
      .set('Authorization', 'Bearer test')
      .expect(200);
    expect(notificationService.list).toHaveBeenCalledWith(
      7,
      expect.any(Object),
    );
  });
  it('gets unread count', () =>
    request(app.getHttpServer())
      .get('/api/notifications/unread-count')
      .set('Authorization', 'Bearer test')
      .expect(200)
      .expect(({ body }: { body: { data: { count: number } } }) => {
        expect(body.data.count).toBe(1);
      }));
  it('marks one read', () =>
    request(app.getHttpServer())
      .patch('/api/notifications/1/read')
      .set('Authorization', 'Bearer test')
      .expect(200));
  it('marks all read', () =>
    request(app.getHttpServer())
      .patch('/api/notifications/read-all')
      .set('Authorization', 'Bearer test')
      .expect(200));
});
