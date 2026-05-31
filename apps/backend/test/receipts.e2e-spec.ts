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
  ReceiptStatus,
} from '../src/generated/prisma/client';
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
  permissions: ['receipts.generate', 'receipts.read'],
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

const receipt = {
  id: 100,
  receiptNumber: 'RCT-20260610-123450',
  folioId: 70,
  paymentId: 95,
  status: ReceiptStatus.ISSUED,
  amount: '100',
  issuedByUserId: 1,
  issuedAt: '2026-06-10T09:05:00.000Z',
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
  payment: {
    id: 95,
    paymentNumber: 'PAY-20260610-123450',
    amount: '100',
    method: PaymentMethod.CASH,
    status: PaymentStatus.RECORDED,
    recordedAt: '2026-06-10T09:00:00.000Z',
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

describe('Receipts API (e2e)', () => {
  let app: INestApplication;

  const invoicesService = {
    generateReceipt: jest.fn(),
    listReceipts: jest.fn(),
    listReceiptsByFolio: jest.fn(),
    getReceiptById: jest.fn(),
    voidReceipt: jest.fn(),
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
    invoicesService.generateReceipt.mockResolvedValue(receipt);
    invoicesService.listReceipts.mockResolvedValue({
      items: [receipt],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    invoicesService.listReceiptsByFolio.mockResolvedValue({
      items: [receipt],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    invoicesService.getReceiptById.mockResolvedValue(receipt);
    invoicesService.voidReceipt.mockResolvedValue({
      ...receipt,
      status: ReceiptStatus.VOIDED,
      voidedAt: '2026-06-10T10:00:00.000Z',
      voidReason: 'Receipt issued against the wrong payment.',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated receipt generation requests', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/receipts/generate')
      .send({
        folioId: 70,
        paymentId: 95,
      })
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      message: 'Authentication required.',
    });
    expect(invoicesService.generateReceipt).not.toHaveBeenCalled();
  });

  it('rejects users without receipt generate permission', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/receipts/generate')
      .set('Authorization', 'Bearer limited-token')
      .send({
        folioId: 70,
        paymentId: 95,
      })
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Missing required permission.',
    });
    expect(invoicesService.generateReceipt).not.toHaveBeenCalled();
  });

  it('generates a receipt for permitted users', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/receipts/generate')
      .set('Authorization', 'Bearer front-desk-token')
      .send({
        folioId: 70,
        paymentId: 95,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 201,
      data: {
        id: 100,
        receiptNumber: 'RCT-20260610-123450',
        amount: '100',
      },
    });
    expect(invoicesService.generateReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      {
        folioId: 70,
        paymentId: 95,
      },
    );
  });

  it('lists receipts with transformed query values', async () => {
    await request(app.getHttpServer())
      .get('/api/receipts')
      .query({
        page: '1',
        limit: '20',
        status: ReceiptStatus.ISSUED,
        folioId: '70',
        paymentId: '95',
      })
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(invoicesService.listReceipts).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.objectContaining({
        page: 1,
        limit: 20,
        status: ReceiptStatus.ISSUED,
        folioId: 70,
        paymentId: 95,
      }),
    );
  });

  it('gets folio receipts before id routes are matched', async () => {
    await request(app.getHttpServer())
      .get('/api/receipts/by-folio/70')
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(invoicesService.listReceiptsByFolio).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      70,
      expect.objectContaining({
        page: 1,
        limit: 20,
      }),
    );
    expect(invoicesService.getReceiptById).not.toHaveBeenCalled();
  });

  it('gets one receipt for permitted users', async () => {
    await request(app.getHttpServer())
      .get('/api/receipts/100')
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(invoicesService.getReceiptById).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      100,
    );
  });

  it('voids one receipt for permitted users', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/receipts/100/void')
      .set('Authorization', 'Bearer front-desk-token')
      .send({
        voidReason: 'Receipt issued against the wrong payment.',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: ReceiptStatus.VOIDED,
        voidReason: 'Receipt issued against the wrong payment.',
      },
    });
    expect(invoicesService.voidReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      100,
      {
        voidReason: 'Receipt issued against the wrong payment.',
      },
    );
  });
});
