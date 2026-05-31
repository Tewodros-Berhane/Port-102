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
  FolioLineItemType,
  FolioStatus,
  StayStatus,
} from '../src/generated/prisma/client';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../src/modules/auth/types/current-user-payload.type';
import { FoliosService } from '../src/modules/folios/folios.service';

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
  permissions: [
    'folios.create',
    'folios.read',
    'folios.update',
    'folios.close',
    'folios.manual_charge.create',
    'folios.discount.apply.small',
    'folios.charge.void',
  ],
};

const limitedUser: TestUser = {
  ...frontDeskUser,
  sub: 2,
  email: 'limited@demo-hotel.com',
  permissions: [],
};

const updateOnlyUser: TestUser = {
  ...frontDeskUser,
  sub: 3,
  email: 'folio-update-only@demo-hotel.com',
  permissions: ['folios.update'],
};

const testUsersByToken = new Map<string, TestUser>([
  ['front-desk-token', frontDeskUser],
  ['limited-token', limitedUser],
  ['update-only-token', updateOnlyUser],
]);

const folio = {
  id: 70,
  folioNumber: 'FOL-20260610-123450',
  stayId: 40,
  guestId: 12,
  status: FolioStatus.OPEN,
  subtotalAmount: '0',
  discountAmount: '0',
  taxAmount: '0',
  serviceAmount: '0',
  totalAmount: '0',
  paidAmount: '0',
  balanceAmount: '0',
  openedAt: '2026-06-10T08:05:00.000Z',
  closedAt: null,
  stay: {
    id: 40,
    stayNumber: 'STAY-20260610-123450',
    status: StayStatus.ACTIVE,
  },
  guest: {
    id: 12,
    firstName: 'Marta',
    lastName: 'Tesfaye',
  },
};
const folioSummary = {
  folio: {
    ...folio,
    subtotalAmount: '200',
    totalAmount: '200',
    balanceAmount: '200',
  },
  lineItems: [
    {
      id: 80,
      folioId: 70,
      type: FolioLineItemType.MANUAL_CHARGE,
      description: 'Extra bed charge',
      quantity: 2,
      unitAmount: '100',
      totalAmount: '200',
      isVoided: false,
    },
  ],
  totals: {
    subtotalAmount: '200',
    discountAmount: '0',
    taxAmount: '0',
    serviceAmount: '0',
    totalAmount: '200',
    paidAmount: '0',
    balanceAmount: '200',
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

describe('Folios API (e2e)', () => {
  let app: INestApplication;

  const foliosService = {
    create: jest.fn(),
    list: jest.fn(),
    getByStayId: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    close: jest.fn(),
    openForStay: jest.fn(),
    getSummary: jest.fn(),
    addLineItem: jest.fn(),
    applyDiscount: jest.fn(),
    voidLineItem: jest.fn(),
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
      .overrideProvider(FoliosService)
      .useValue(foliosService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    foliosService.create.mockResolvedValue(folio);
    foliosService.list.mockResolvedValue({
      items: [folio],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    foliosService.getByStayId.mockResolvedValue(folio);
    foliosService.getById.mockResolvedValue(folio);
    foliosService.update.mockResolvedValue({
      ...folio,
      status: FolioStatus.VOIDED,
    });
    foliosService.close.mockResolvedValue({
      ...folio,
      status: FolioStatus.CLOSED,
      closedAt: '2026-06-12T08:00:00.000Z',
      closedByUserId: 1,
    });
    foliosService.openForStay.mockResolvedValue(folio);
    foliosService.getSummary.mockResolvedValue(folioSummary);
    foliosService.addLineItem.mockResolvedValue(folioSummary);
    foliosService.applyDiscount.mockResolvedValue({
      ...folioSummary,
      folio: {
        ...folioSummary.folio,
        discountAmount: '20',
        totalAmount: '180',
        balanceAmount: '180',
      },
      totals: {
        ...folioSummary.totals,
        discountAmount: '20',
        totalAmount: '180',
        balanceAmount: '180',
      },
    });
    foliosService.voidLineItem.mockResolvedValue({
      ...folioSummary,
      folio,
      lineItems: [],
      totals: {
        ...folioSummary.totals,
        subtotalAmount: '0',
        totalAmount: '0',
        balanceAmount: '0',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated folio creation requests', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/folios')
      .send({
        stayId: 40,
      })
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      message: 'Authentication required.',
    });
    expect(foliosService.create).not.toHaveBeenCalled();
  });

  it('rejects users without folio create permission', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/folios')
      .set('Authorization', 'Bearer limited-token')
      .send({
        stayId: 40,
      })
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Missing required permission.',
    });
    expect(foliosService.create).not.toHaveBeenCalled();
  });

  it('allows permitted users to open a folio', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/folios')
      .set('Authorization', 'Bearer front-desk-token')
      .send({
        stayId: 40,
        guestId: 12,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 201,
      data: {
        id: 70,
        folioNumber: 'FOL-20260610-123450',
      },
    });
    expect(foliosService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      {
        stayId: 40,
        guestId: 12,
      },
    );
  });

  it('lists folios with transformed query values', async () => {
    await request(app.getHttpServer())
      .get('/api/folios')
      .query({
        page: '1',
        limit: '20',
        status: FolioStatus.OPEN,
        stayId: '40',
      })
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(foliosService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.objectContaining({
        page: 1,
        limit: 20,
        status: FolioStatus.OPEN,
        stayId: 40,
      }),
    );
  });

  it('gets a folio by stay before id routes are matched', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/folios/by-stay/40')
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        stayId: 40,
      },
    });
    expect(foliosService.getByStayId).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      40,
    );
    expect(foliosService.getById).not.toHaveBeenCalled();
  });

  it('gets one folio for permitted users', async () => {
    await request(app.getHttpServer())
      .get('/api/folios/70')
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(foliosService.getById).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      70,
    );
  });

  it('gets folio summary before id routes are matched', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/folios/70/summary')
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        folio: {
          id: 70,
        },
        totals: {
          totalAmount: '200',
          balanceAmount: '200',
        },
      },
    });
    expect(foliosService.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      70,
    );
    expect(foliosService.getById).not.toHaveBeenCalled();
  });

  it('updates one folio for permitted users', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/folios/70')
      .set('Authorization', 'Bearer front-desk-token')
      .send({
        status: FolioStatus.VOIDED,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: FolioStatus.VOIDED,
      },
    });
    expect(foliosService.update).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      70,
      {
        status: FolioStatus.VOIDED,
      },
    );
  });

  it('closes one settled folio for permitted users', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/folios/70/close')
      .set('Authorization', 'Bearer front-desk-token')
      .send({
        notes: 'Folio settled at checkout.',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: FolioStatus.CLOSED,
        closedByUserId: 1,
      },
    });
    expect(foliosService.close).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      70,
      {
        notes: 'Folio settled at checkout.',
      },
    );
  });

  it('rejects users without folio close permission', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/folios/70/close')
      .set('Authorization', 'Bearer update-only-token')
      .send({
        notes: 'Folio settled at checkout.',
      })
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Missing required permission.',
    });
    expect(foliosService.close).not.toHaveBeenCalled();
  });

  it('rejects users without manual charge permission', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/folios/70/line-items')
      .set('Authorization', 'Bearer limited-token')
      .send({
        type: FolioLineItemType.MANUAL_CHARGE,
        description: 'Extra bed charge',
        quantity: 2,
        unitAmount: 100,
      })
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Missing required permission.',
    });
    expect(foliosService.addLineItem).not.toHaveBeenCalled();
  });

  it('adds a manual charge line item for permitted users', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/folios/70/line-items')
      .set('Authorization', 'Bearer front-desk-token')
      .send({
        type: FolioLineItemType.MANUAL_CHARGE,
        description: 'Extra bed charge',
        quantity: 2,
        unitAmount: 100,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 201,
      data: {
        totals: {
          totalAmount: '200',
          balanceAmount: '200',
        },
      },
    });
    expect(foliosService.addLineItem).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      70,
      {
        type: FolioLineItemType.MANUAL_CHARGE,
        description: 'Extra bed charge',
        quantity: 2,
        unitAmount: 100,
      },
    );
  });

  it('rejects users without discount permission', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/folios/70/discounts')
      .set('Authorization', 'Bearer limited-token')
      .send({
        description: 'Service recovery discount',
        percent: 10,
      })
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Missing required permission.',
    });
    expect(foliosService.applyDiscount).not.toHaveBeenCalled();
  });

  it('applies a folio discount for permitted users', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/folios/70/discounts')
      .set('Authorization', 'Bearer front-desk-token')
      .send({
        description: 'Service recovery discount',
        percent: 10,
        reason: 'Room readiness was delayed.',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 201,
      data: {
        totals: {
          discountAmount: '20',
          totalAmount: '180',
          balanceAmount: '180',
        },
      },
    });
    expect(foliosService.applyDiscount).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      70,
      {
        description: 'Service recovery discount',
        percent: 10,
        reason: 'Room readiness was delayed.',
      },
    );
  });

  it('voids a line item for permitted users', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/folios/70/line-items/80/void')
      .set('Authorization', 'Bearer front-desk-token')
      .send({
        voidReason: 'Wrong folio.',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        totals: {
          totalAmount: '0',
          balanceAmount: '0',
        },
      },
    });
    expect(foliosService.voidLineItem).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      70,
      80,
      {
        voidReason: 'Wrong folio.',
      },
    );
  });
});
