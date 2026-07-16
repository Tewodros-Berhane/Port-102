import {
  ExecutionContext,
  ForbiddenException,
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
import { DepartmentsService } from '../src/modules/departments/departments.service';

const department = {
  id: 1,
  key: 'FINANCE',
  name: 'Finance',
  description: null,
  isActive: true,
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T00:00:00.000Z',
};
const users = new Map([
  [
    'admin',
    {
      sub: 1,
      email: 'admin@test.com',
      roleKey: 'HOTEL_ADMIN',
      roleId: 2,
      departmentId: null,
      tokenVersion: 0,
      permissions: [
        'departments.create',
        'departments.read',
        'departments.update',
        'departments.delete',
      ],
    },
  ],
  [
    'reader',
    {
      sub: 2,
      email: 'reader@test.com',
      roleKey: 'HOTEL_OWNER',
      roleId: 1,
      departmentId: null,
      tokenVersion: 0,
      permissions: ['departments.read'],
    },
  ],
]);

function requiredPermissions(context: ExecutionContext): string[] {
  const controller = Reflect.getMetadata(
    REQUIRED_PERMISSIONS_KEY,
    context.getClass(),
  ) as string[] | undefined;
  const handler = Reflect.getMetadata(
    REQUIRED_PERMISSIONS_KEY,
    context.getHandler(),
  ) as string[] | undefined;
  return [...(controller ?? []), ...(handler ?? [])];
}

describe('Departments API (e2e)', () => {
  let app: INestApplication;
  const service = {
    create: jest.fn(),
    list: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  beforeAll(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://postgres:postgres@localhost:5432/port_102?schema=public';
    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            headers: { authorization?: string };
            user?: unknown;
          }>();
          const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
          if (!token || !users.has(token)) throw new UnauthorizedException();
          req.user = users.get(token);
          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const required = requiredPermissions(context);
          const permissions =
            context
              .switchToHttp()
              .getRequest<{ user?: { permissions: string[] } }>().user
              ?.permissions ?? [];
          if (!required.every((key) => permissions.includes(key)))
            throw new ForbiddenException();
          return true;
        },
      })
      .overrideProvider(DepartmentsService)
      .useValue(service)
      .compile();
    app = fixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    service.create.mockResolvedValue(department);
    service.list.mockResolvedValue({
      items: [department],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    service.getById.mockResolvedValue(department);
    service.update.mockResolvedValue({ ...department, name: 'Accounting' });
    service.remove.mockResolvedValue({ ...department, isActive: false });
  });
  afterAll(async () => app.close());

  it('requires authentication', () =>
    request(app.getHttpServer()).get('/api/departments').expect(401));
  it('enforces endpoint permissions', () =>
    request(app.getHttpServer())
      .post('/api/departments')
      .set('Authorization', 'Bearer reader')
      .send({ key: 'HR', name: 'HR' })
      .expect(403));
  it('creates a validated department', async () => {
    await request(app.getHttpServer())
      .post('/api/departments')
      .set('Authorization', 'Bearer admin')
      .send({ key: 'FINANCE', name: 'Finance' })
      .expect(201);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 1 }),
      { key: 'FINANCE', name: 'Finance' },
    );
  });
  it('lists departments with transformed pagination', async () => {
    await request(app.getHttpServer())
      .get('/api/departments?page=2&limit=10&isActive=true')
      .set('Authorization', 'Bearer reader')
      .expect(200);
    expect(service.list).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ page: 2, limit: 10, isActive: true }),
    );
  });
  it('gets, updates, and deactivates a department', async () => {
    await request(app.getHttpServer())
      .get('/api/departments/1')
      .set('Authorization', 'Bearer reader')
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/departments/1')
      .set('Authorization', 'Bearer admin')
      .send({ name: 'Accounting' })
      .expect(200);
    await request(app.getHttpServer())
      .delete('/api/departments/1')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(service.getById).toHaveBeenCalledWith(expect.anything(), 1);
    expect(service.update).toHaveBeenCalledWith(expect.anything(), 1, {
      name: 'Accounting',
    });
    expect(service.remove).toHaveBeenCalledWith(expect.anything(), 1);
  });
});
