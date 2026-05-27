import {
  ConflictException,
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
import {
  ReservationSource,
  ReservationStatus,
} from '../src/generated/prisma/client';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../src/modules/auth/types/current-user-payload.type';
import { ReservationsService } from '../src/modules/reservations/reservations.service';

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
  email: 'admin@demo-hotel.com',
  roleKey: 'HOTEL_ADMIN',
  roleId: 2,
  departmentId: null,
  tokenVersion: 0,
  permissions: [
    'reservations.create',
    'reservations.read',
    'reservations.update',
    'reservations.cancel',
    'reservations.no_show.mark',
    'reservations.confirm',
    'availability.read',
    'booking_calendar.read',
  ],
};

const limitedUser: TestUser = {
  ...adminUser,
  sub: 2,
  email: 'limited@demo-hotel.com',
  permissions: ['reservations.read'],
};

const testUsersByToken = new Map<string, TestUser>([
  ['admin-token', adminUser],
  ['limited-token', limitedUser],
]);

const reservation = {
  id: 20,
  reservationNumber: 'RES-20260527-123450',
  guestId: 12,
  status: ReservationStatus.CONFIRMED,
  source: ReservationSource.PHONE,
  checkInDate: '2026-06-10T00:00:00.000Z',
  checkOutDate: '2026-06-12T00:00:00.000Z',
  adults: 2,
  children: 1,
  guest: {
    id: 12,
    firstName: 'Marta',
    lastName: 'Tesfaye',
    email: 'marta@example.com',
  },
  rooms: [
    {
      id: 30,
      roomTypeId: 4,
      roomId: 9,
      status: 'RESERVED',
      roomType: {
        id: 4,
        name: 'Deluxe King',
        code: 'DLX-KING',
        baseRate: '125.50',
      },
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

describe('Reservations read and availability API (e2e)', () => {
  let app: INestApplication;

  const reservationsService = {
    create: jest.fn(),
    list: jest.fn(),
    getById: jest.fn(),
    searchAvailability: jest.fn(),
    getAvailabilityByRoomType: jest.fn(),
    listAvailableRooms: jest.fn(),
    getBookingCalendar: jest.fn(),
    update: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    markNoShow: jest.fn(),
    addRoom: jest.fn(),
    updateRoom: jest.fn(),
    removeRoom: jest.fn(),
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
      .overrideProvider(ReservationsService)
      .useValue(reservationsService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    reservationsService.create.mockResolvedValue(reservation);
    reservationsService.list.mockResolvedValue({
      items: [reservation],
      pagination: {
        page: 2,
        limit: 1,
        total: 3,
        totalPages: 3,
      },
    });
    reservationsService.getById.mockResolvedValue(reservation);
    reservationsService.searchAvailability.mockResolvedValue({
      checkInDate: '2026-06-10T00:00:00.000Z',
      checkOutDate: '2026-06-12T00:00:00.000Z',
      nights: 2,
      adults: 2,
      children: 1,
      roomTypeId: null,
      roomTypes: [
        {
          roomType: {
            id: 4,
            name: 'Deluxe King',
            code: 'DLX-KING',
            baseRate: '125.50',
          },
          totalRooms: 5,
          reservedRooms: 1,
          availableRooms: 4,
          isAvailable: true,
        },
      ],
    });
    reservationsService.getAvailabilityByRoomType.mockResolvedValue({
      checkInDate: '2026-06-10T00:00:00.000Z',
      checkOutDate: '2026-06-12T00:00:00.000Z',
      nights: 2,
      roomTypeId: 4,
      roomTypes: [
        {
          roomType: {
            id: 4,
            code: 'DLX-KING',
          },
          totalRooms: 5,
          reservedRooms: 1,
          availableRooms: 4,
        },
      ],
    });
    reservationsService.listAvailableRooms.mockResolvedValue({
      checkInDate: '2026-06-10T00:00:00.000Z',
      checkOutDate: '2026-06-12T00:00:00.000Z',
      nights: 2,
      roomTypeId: 4,
      rooms: [
        {
          id: 9,
          roomNumber: '101',
          roomTypeId: 4,
        },
      ],
    });
    reservationsService.getBookingCalendar.mockResolvedValue({
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-06-30T00:00:00.000Z',
      roomId: null,