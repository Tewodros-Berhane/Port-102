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
import { ReservationStatus, StayStatus } from '../src/generated/prisma/client';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../src/modules/auth/types/current-user-payload.type';
import { FrontDeskService } from '../src/modules/front-desk/front-desk.service';

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
    'reservations.read',
    'arrivals.read',
    'departures.read',
    'in_house_guests.read',
  ],
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

const dashboard = {
  date: '2026-06-10',
  arrivalsToday: 3,
  departuresToday: 2,
  inHouseGuests: 8,
  activeStays: 8,
  vacantRooms: 12,
  occupiedRooms: 8,
  dirtyRooms: 4,
  outOfOrderRooms: 1,
  availablePhysicalRooms: 10,
};

const arrival = {
  id: 20,
  reservationNumber: 'RES-20260610-123450',
  status: ReservationStatus.CONFIRMED,
  checkInDate: '2026-06-10T00:00:00.000Z',
  checkOutDate: '2026-06-12T00:00:00.000Z',
  guest: {
    id: 12,
    firstName: 'Marta',
    lastName: 'Tesfaye',
  },
  rooms: [],
};

const activeStay = {
  id: 40,
  stayNumber: 'STAY-20260610-123450',
  status: StayStatus.ACTIVE,
  expectedCheckOutDate: '2026-06-12T00:00:00.000Z',
  guest: {
    id: 12,
    firstName: 'Marta',
    lastName: 'Tesfaye',
  },
  reservation: {
    id: 20,
    reservationNumber: 'RES-20260610-123450',
  },
  currentRooms: [
    {
      assignmentId: 50,
      roomId: 9,
      reservationRoomId: 30,
      room: {
        id: 9,
        roomNumber: '101',
      },
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

describe('Front desk API (e2e)', () => {
  let app: INestApplication;

  const frontDeskService = {
    getDashboard: jest.fn(),
    listArrivals: jest.fn(),
    listDepartures: jest.fn(),
    listInHouse: jest.fn(),
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
      .overrideProvider(FrontDeskService)
      .useValue(frontDeskService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    frontDeskService.getDashboard.mockResolvedValue(dashboard);
    frontDeskService.listArrivals.mockResolvedValue({
      date: '2026-06-10',
      items: [arrival],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    frontDeskService.listDepartures.mockResolvedValue({
      date: '2026-06-12',
      items: [activeStay],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
    frontDeskService.listInHouse.mockResolvedValue({
      items: [activeStay],
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

  it('rejects unauthenticated dashboard requests', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/front-desk/dashboard')
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      message: 'Authentication required.',
    });
    expect(frontDeskService.getDashboard).not.toHaveBeenCalled();
  });

  it('returns dashboard counts for permitted users', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/front-desk/dashboard')
      .query({
        date: '2026-06-10',
      })
      .set('Authorization', 'Bearer front-desk-token')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 200,
      data: {
        arrivalsToday: 3,
        availablePhysicalRooms: 10,
      },
    });
    expect(frontDeskService.getDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      {
        date: '2026-06-10',
      },
    );
  });

  it('rejects users without arrivals permission', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/front-desk/arrivals')
      .set('Authorization', 'Bearer limited-token')
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Missing required permission.',
    });
    expect(frontDeskService.listArrivals).not.toHaveBeenCalled();
