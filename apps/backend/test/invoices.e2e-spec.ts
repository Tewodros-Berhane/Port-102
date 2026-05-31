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
import { FolioStatus, InvoiceStatus } from '../src/generated/prisma/client';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../src/modules/auth/types/current-user-payload.type';
import { InvoicesService } from '../src/modules/invoices/invoices.service';

type TestUser = CurrentUserPayload & {
  permissions: string[];
};

type RequestWithTestUser = {
  headers: {
    authorization?: string;
  };
  user?: TestUser;
};

const frontDeskUser: TestUser = {
  sub: 1,
  email: 'frontdesk@demo-hotel.com',
  roleKey: 'FRONT_DESK_CASHIER',
  roleId: 4,
  departmentId: null,
  tokenVersion: 0,
  permissions: ['invoices.generate', 'invoices.read'],
};

const limitedUser: TestUser = {
  ...frontDeskUser,
  sub: 2,
  email: 'limited@demo-hotel.com',
  permissions: [],
};

const testUsersByToken = new Map<string, TestUser>([
  ['front-desk-token', frontDeskUser],
  ['limited-token', limitedUser],
]);

const invoice = {
  id: 90,
  invoiceNumber: 'INV-20260610-123450',
  folioId: 70,
  status: InvoiceStatus.ISSUED,
  subtotalAmount: '220',
  discountAmount: '20',
  taxAmount: '10',
  serviceAmount: '5',
  totalAmount: '215',
  issuedByUserId: 1,
  issuedAt: '2026-06-10T09:00:00.000Z',
  voidedAt: null,
  voidReason: null,
  folio: {
    id: 70,
    folioNumber: 'FOL-20260610-123450',
    stayId: 40,
    guestId: 12,
    status: FolioStatus.OPEN,
    totalAmount: '215',
    paidAmount: '100',
    balanceAmount: '115',
  },
};

function getRequiredPermissions(context: ExecutionContext) {
  const controllerPermissions =
    (Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, context.getClass()) as
      | string[]
      | undefined) ?? [];
  const handlerPermissions =
    (Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, context.getHandler()) as
      | string[]
      | undefined) ?? [];

  return [...controllerPermissions, ...handlerPermissions];
}

describe('Invoices API (e2e)', () => {
  let app: INestApplication;

  const invoicesService = {
    generate: jest.fn(),
    list: jest.fn(),
    listByFolio: jest.fn(),
    getById: jest.fn(),
    void: jest.fn(),
  };

  beforeAll(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://postgres:postgres@localhost:5432/port_102?schema=public';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const httpRequest = context
            .switchToHttp()
            .getRequest<RequestWithTestUser>();
          const token = httpRequest.headers.authorization?.replace(
            /^Bearer\s+/i,
            '',
          );

          if (!token || !testUsersByToken.has(token)) {
            throw new UnauthorizedException('Authentication required.');
          }

          httpRequest.user = testUsersByToken.get(token);

          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const requiredPermissions = getRequiredPermissions(context);
          const httpRequest = context
            .switchToHttp()
            .getRequest<RequestWithTestUser>();
          const userPermissions = httpRequest.user?.permissions ?? [];

          if (
            requiredPermissions.every((permission) =>
              userPermissions.includes(permission),
            )
          ) {
            return true;
          }

          throw new ForbiddenException('Missing required permission.');
        },
      })
      .overrideProvider(InvoicesService)
      .useValue(invoicesService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    invoicesService.generate.mockResolvedValue(invoice);
    invoicesService.list.mockResolvedValue({
      items: [invoice],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    invoicesService.listByFolio.mockResolvedValue({
      items: [invoice],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    invoicesService.getById.mockResolvedValue(invoice);
    invoicesService.void.mockResolvedValue({
      ...invoice,
      status: InvoiceStatus.VOIDED,
      voidedAt: '2026-06-10T10:00:00.000Z',
      voidReason: 'Invoice regenerated with corrected folio totals.',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated invoice generation requests', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/invoices/generate')
      .send({
        folioId: 70,
      })
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      message: 'Authentication required.',
    });
    expect(invoicesService.generate).not.toHaveBeenCalled();
  });

  it('rejects users without invoice generate permission', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/invoices/generate')
      .set('Authorization', 'Bearer limited-token')
      .send({
        folioId: 70,
      })
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Missing required permission.',
    });
    expect(invoicesService.generate).not.toHaveBeenCalled();
  });

  it('generates an invoice for permitted users', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/invoices/generate')
      .set('Authorization', 'Bearer front-desk-token')
      .send({
        folioId: 70,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 201,
      data: {
        id: 90,
        invoiceNumber: 'INV-20260610-123450',
        totalAmount: '215',
      },
    });
    expect(invoicesService.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      {
        folioId: 70,
      },
    );
  });

  it('lists invoices with transformed query values', async () => {
    await request(app.getHttpServer())
      .get('/api/invoices')
      .query({
        page: '1',
        limit: '20',
        status: InvoiceStatus.ISSUED,
        folioId: '70',
      })
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(invoicesService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.objectContaining({
        page: 1,
        limit: 20,
        status: InvoiceStatus.ISSUED,
        folioId: 70,
      }),
    );
  });

  it('gets folio invoices before id routes are matched', async () => {
    await request(app.getHttpServer())
      .get('/api/invoices/by-folio/70')
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(invoicesService.listByFolio).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      70,
      expect.objectContaining({
        page: 1,
        limit: 20,
      }),
    );
    expect(invoicesService.getById).not.toHaveBeenCalled();
  });

  it('gets one invoice for permitted users', async () => {
    await request(app.getHttpServer())
      .get('/api/invoices/90')
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(invoicesService.getById).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      90,
    );
  });

  it('voids one invoice for permitted users', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/invoices/90/void')
      .set('Authorization', 'Bearer front-desk-token')
      .send({
        voidReason: 'Invoice regenerated with corrected folio totals.',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: InvoiceStatus.VOIDED,
        voidReason: 'Invoice regenerated with corrected folio totals.',
      },
    });
    expect(invoicesService.void).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      90,
      {
        voidReason: 'Invoice regenerated with corrected folio totals.',
      },
    );
  });
});
