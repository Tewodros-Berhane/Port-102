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
  ReservationStatus,
  StayRoomAssignmentStatus,
  StayStatus,
} from '../src/generated/prisma/client';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../src/modules/auth/types/current-user-payload.type';
import { StaysService } from '../src/modules/stays/stays.service';

type TestUser = CurrentUserPayload & {
  permissions: string[];
};

type RequestWithTestUser = {
  headers: {
    authorization?: string;
  };
  user?: TestUser;
};

const adminUser: TestUser = {
  sub: 1,
  email: 'frontdesk@demo-hotel.com',
  roleKey: 'FRONT_DESK_CASHIER',
  roleId: 4,
  departmentId: null,
  tokenVersion: 0,
  permissions: [
    'check_in.execute',
    'reservations.read',
    'in_house_guests.read',
  ],
};

const limitedUser: TestUser = {
  ...adminUser,
  sub: 2,
  email: 'limited@demo-hotel.com',
  permissions: [],
};

const testUsersByToken = new Map<string, TestUser>([
  ['front-desk-token', adminUser],
  ['limited-token', limitedUser],
]);

const checkedInStay = {
  id: 40,
  stayNumber: 'STAY-20260610-123450',
  reservationId: 20,
  guestId: 12,
  status: StayStatus.ACTIVE,
  checkedInAt: '2026-06-10T08:00:00.000Z',
  expectedCheckOutDate: '2026-06-12T00:00:00.000Z',
  checkedOutAt: null,
  reservation: {
    id: 20,
    reservationNumber: 'RES-20260610-123450',
    status: ReservationStatus.CHECKED_IN,
  },
  roomAssignments: [
    {
      id: 50,
      stayId: 40,
      roomId: 9,
      reservationRoomId: 30,
      status: StayRoomAssignmentStatus.ACTIVE,
    },
  ],
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

describe('Stay lifecycle API (e2e)', () => {
  let app: INestApplication;

  const staysService = {
    checkInReservation: jest.fn(),
    list: jest.fn(),
    getById: jest.fn(),
    listActive: jest.fn(),
    listInHouseGuests: jest.fn(),
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
      .overrideProvider(StaysService)
      .useValue(staysService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    staysService.checkInReservation.mockResolvedValue(checkedInStay);
    staysService.list.mockResolvedValue({
      items: [checkedInStay],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    staysService.getById.mockResolvedValue(checkedInStay);
    staysService.listActive.mockResolvedValue({
      items: [checkedInStay],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    staysService.listInHouseGuests.mockResolvedValue({
      items: [
        {
          guest: {
            id: 12,
            firstName: 'Marta',
            lastName: 'Tesfaye',
          },
          stay: {
            id: 40,
            stayNumber: 'STAY-20260610-123450',
          },
          currentRooms: [
            {
              assignmentId: 50,
              roomId: 9,
            },
          ],
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated reservation check-in requests', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/reservations/20/check-in')
      .send({
        roomAssignments: [{ reservationRoomId: 30, roomId: 9 }],
      })
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      message: 'Authentication required.',
    });
    expect(staysService.checkInReservation).not.toHaveBeenCalled();
  });

  it('rejects users without check-in permission', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/reservations/20/check-in')
      .set('Authorization', 'Bearer limited-token')
      .send({
        roomAssignments: [{ reservationRoomId: 30, roomId: 9 }],
      })
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Missing required permission.',
    });
    expect(staysService.checkInReservation).not.toHaveBeenCalled();
  });

  it('allows permitted front desk users to check in a reservation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/reservations/20/check-in')
      .set('Authorization', 'Bearer front-desk-token')
      .send({
        roomAssignments: [{ reservationRoomId: 30, roomId: 9 }],
        notes: 'Guest arrived.',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 201,
      data: {
        id: 40,
        reservationId: 20,
        status: StayStatus.ACTIVE,
        roomAssignments: [
          {
            reservationRoomId: 30,
            roomId: 9,
          },
        ],
      },
    });
    expect(staysService.checkInReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      20,
      expect.objectContaining({
        roomAssignments: [
          expect.objectContaining({
            reservationRoomId: 30,
            roomId: 9,
          }),
        ],
        notes: 'Guest arrived.',
      }),
    );
  });

  it('rejects users without stay read permission', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/stays')
      .set('Authorization', 'Bearer limited-token')
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Missing required permission.',
    });
    expect(staysService.list).not.toHaveBeenCalled();
  });

  it('lists stays for permitted users', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/stays')
      .query({
        page: 1,
        limit: 20,
        search: 'Marta',
      })
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 200,
      data: {
        items: [
          {
            id: 40,
            stayNumber: 'STAY-20260610-123450',
          },
        ],
      },
    });
    expect(staysService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.objectContaining({
        page: 1,
        limit: 20,
        search: 'Marta',
      }),
    );
  });

  it('gets one stay for permitted users', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/stays/40')
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 200,
      data: {
        id: 40,
        reservationId: 20,
      },
    });
    expect(staysService.getById).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      40,
    );
  });

  it('lists active stays before id routes are matched', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/stays/active/list')
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 200,
      data: {
        items: [
          {
            id: 40,
          },
        ],
      },
    });
    expect(staysService.listActive).toHaveBeenCalled();
    expect(staysService.getById).not.toHaveBeenCalled();
  });

  it('lists in-house guests for permitted users', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/stays/in-house/guests')
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 200,
      data: {
        items: [
          {
            guest: {
              id: 12,
            },
            currentRooms: [
              {
                roomId: 9,
              },
            ],
          },
        ],
      },
    });
    expect(staysService.listInHouseGuests).toHaveBeenCalled();
  });
});
