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
import {
  FolioStatus,
  PaymentMethod,
  PaymentStatus,
} from '../src/generated/prisma/client';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../src/modules/auth/types/current-user-payload.type';
import { PaymentsService } from '../src/modules/payments/payments.service';

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
  permissions: ['payments.record', 'payments.read', 'payments.void'],
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

const payment = {
  id: 90,
  paymentNumber: 'PAY-20260610-123450',
  folioId: 70,
  amount: '50',
  method: PaymentMethod.CASH,
  status: PaymentStatus.RECORDED,
  reference: 'AUTH-123456',
  notes: 'Guest paid at front desk.',
  recordedByUserId: 1,
  recordedAt: '2026-06-10T09:00:00.000Z',
  voidedAt: null,
  voidReason: null,
  folio: {
    id: 70,
    folioNumber: 'FOL-20260610-123450',
    stayId: 40,
    guestId: 12,
    status: FolioStatus.OPEN,
    totalAmount: '200',
    paidAmount: '70',
    balanceAmount: '130',
  },
};

const receipt = {
  id: 100,
  receiptNumber: 'RCT-20260610-123450',
  folioId: 70,
  paymentId: 90,
  status: 'ISSUED',
  amount: '50',
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

describe('Payments API (e2e)', () => {
  let app: INestApplication;

  const paymentsService = {
    record: jest.fn(),
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
      .overrideProvider(PaymentsService)
      .useValue(paymentsService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    paymentsService.record.mockResolvedValue({
      payment,
      folio: payment.folio,
      receipt,
    });
    paymentsService.list.mockResolvedValue({
      items: [payment],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    paymentsService.listByFolio.mockResolvedValue({
      items: [payment],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    paymentsService.getById.mockResolvedValue(payment);
    paymentsService.void.mockResolvedValue({
      payment: {
        ...payment,
        status: PaymentStatus.VOIDED,
        voidedAt: '2026-06-10T10:00:00.000Z',
        voidReason: 'Duplicate payment entry.',
      },
      folio: {
        ...payment.folio,
        paidAmount: '20',
        balanceAmount: '180',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated payment recording requests', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/payments')
      .send({
        folioId: 70,
        amount: 50,
        method: PaymentMethod.CASH,
      })
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      message: 'Authentication required.',
    });
    expect(paymentsService.record).not.toHaveBeenCalled();
  });

  it('rejects users without payment record permission', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Authorization', 'Bearer limited-token')
      .send({
        folioId: 70,
        amount: 50,
        method: PaymentMethod.CASH,
      })
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Missing required permission.',
    });
    expect(paymentsService.record).not.toHaveBeenCalled();
  });

  it('records a payment for permitted users', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/payments')
      .set('Authorization', 'Bearer front-desk-token')
      .send({
        folioId: 70,
        amount: 50,
        method: PaymentMethod.CASH,
        reference: 'AUTH-123456',
        notes: 'Guest paid at front desk.',
        generateReceipt: true,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 201,
      data: {
        payment: {
          id: 90,
          amount: '50',
        },
        folio: {
          balanceAmount: '130',
        },
        receipt: {
          id: 100,
        },
      },
    });
    expect(paymentsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      {
        folioId: 70,
        amount: 50,
        method: PaymentMethod.CASH,
        reference: 'AUTH-123456',
        notes: 'Guest paid at front desk.',
        generateReceipt: true,
      },
    );
  });

  it('lists payments with transformed query values', async () => {
    await request(app.getHttpServer())
      .get('/api/payments')
      .query({
        page: '1',
        limit: '20',
        status: PaymentStatus.RECORDED,
        method: PaymentMethod.CASH,
        folioId: '70',
      })
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(paymentsService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.objectContaining({
        page: 1,
        limit: 20,
        status: PaymentStatus.RECORDED,
        method: PaymentMethod.CASH,
        folioId: 70,
      }),
    );
  });

  it('gets folio payments before id routes are matched', async () => {
    await request(app.getHttpServer())
      .get('/api/payments/by-folio/70')
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(paymentsService.listByFolio).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      70,
      expect.objectContaining({
        page: 1,
        limit: 20,
      }),
    );
    expect(paymentsService.getById).not.toHaveBeenCalled();
  });

  it('gets one payment for permitted users', async () => {
    await request(app.getHttpServer())
      .get('/api/payments/90')
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(paymentsService.getById).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      90,
    );
  });

  it('voids one payment for permitted users', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/payments/90/void')
      .set('Authorization', 'Bearer front-desk-token')
      .send({
        voidReason: 'Duplicate payment entry.',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        payment: {
          status: PaymentStatus.VOIDED,
          voidReason: 'Duplicate payment entry.',
        },
        folio: {
          balanceAmount: '180',
        },
      },
    });
    expect(paymentsService.void).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      90,
      {
        voidReason: 'Duplicate payment entry.',
      },
    );
  });
});
