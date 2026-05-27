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
      roomTypeId: 4,
      status: null,
      items: [reservation],
    });
    reservationsService.update.mockResolvedValue({
      ...reservation,
      internalNotes: 'Updated note',
    });
    reservationsService.confirm.mockResolvedValue(reservation);
    reservationsService.cancel.mockResolvedValue({
      ...reservation,
      status: ReservationStatus.CANCELLED,
      cancellationReason: 'Guest cancelled',
    });
    reservationsService.markNoShow.mockResolvedValue({
      ...reservation,
      status: ReservationStatus.NO_SHOW,
    });
    reservationsService.addRoom.mockResolvedValue({
      ...reservation,
      rooms: [
        ...reservation.rooms,
        {
          ...reservation.rooms[0],
          id: 31,
          roomId: null,
        },
      ],
    });
    reservationsService.updateRoom.mockResolvedValue({
      ...reservation,
      rooms: [
        {
          ...reservation.rooms[0],
          roomId: null,
        },
      ],
    });
    reservationsService.removeRoom.mockResolvedValue({
      ...reservation,
      rooms: [],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated reservation read requests', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/reservations')
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      message: 'Authentication required.',
    });
    expect(reservationsService.list).not.toHaveBeenCalled();
  });

  it('rejects users without the required reservation availability permission', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/reservations/calendar')
      .query({
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      })
      .set('Authorization', 'Bearer limited-token')
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Missing required permission.',
    });
    expect(reservationsService.getBookingCalendar).not.toHaveBeenCalled();
  });

  it('allows a permitted hotel admin to create a reservation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', 'Bearer admin-token')
      .send({
        guestId: 12,
        checkInDate: '2026-06-10',
        checkOutDate: '2026-06-12',
        adults: 2,
        children: 1,
        source: ReservationSource.PHONE,
        rooms: [
          {
            roomTypeId: 4,
            roomId: 9,
            rate: 125.5,
          },
        ],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 201,
      data: {
        id: 20,
        reservationNumber: 'RES-20260527-123450',
      },
    });
    expect(reservationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.objectContaining({
        guestId: 12,
        adults: 2,
        children: 1,
        source: ReservationSource.PHONE,
        rooms: [
          expect.objectContaining({
            roomTypeId: 4,
            roomId: 9,
            rate: 125.5,
          }),
        ],
      }),
    );
  });

  it('returns conflict when an overlapping booking is rejected', async () => {
    reservationsService.create.mockRejectedValueOnce(
      new ConflictException(
        'Selected room is already reserved for the requested dates.',
      ),
    );

    const response = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', 'Bearer admin-token')
      .send({
        guestId: 12,
        checkInDate: '2026-06-10',
        checkOutDate: '2026-06-12',
        rooms: [
          {
            roomTypeId: 4,
            roomId: 9,
          },
        ],
      })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 409,
      message: 'Selected room is already reserved for the requested dates.',
    });
  });

  it('allows a back-to-back reservation request', async () => {
    reservationsService.create.mockResolvedValueOnce({
      ...reservation,
      id: 21,
      reservationNumber: 'RES-20260527-123451',
      checkInDate: '2026-06-12T00:00:00.000Z',
      checkOutDate: '2026-06-14T00:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', 'Bearer admin-token')
      .send({
        guestId: 12,
        checkInDate: '2026-06-12',
        checkOutDate: '2026-06-14',
        rooms: [
          {
            roomTypeId: 4,
            roomId: 9,
          },
        ],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: 21,
        checkInDate: '2026-06-12T00:00:00.000Z',
      },
    });
    expect(reservationsService.create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        checkInDate: '2026-06-12',
        checkOutDate: '2026-06-14',
      }),
    );
  });

  it('lists reservations with transformed query values', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/reservations')
      .query({
        page: '2',
        limit: '1',
        status: ReservationStatus.CONFIRMED,
        guestId: '12',
      })
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 200,
      data: {
        items: [
          {
            id: 20,
            reservationNumber: 'RES-20260527-123450',
          },
        ],
        pagination: {
          page: 2,
          limit: 1,
          total: 3,
          totalPages: 3,
        },
      },
    });
    expect(reservationsService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.objectContaining({
        page: 2,
        limit: 1,
        status: ReservationStatus.CONFIRMED,
        guestId: 12,
      }),
    );
  });

  it('returns reservation detail', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/reservations/20')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: 20,
        rooms: [
          {
            roomId: 9,
          },
        ],
      },
    });
    expect(reservationsService.getById).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      20,
    );
  });

  it('searches date-based availability without hitting the id route', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/reservations/availability/search')
      .query({
        checkInDate: '2026-06-10',
        checkOutDate: '2026-06-12',
        adults: '2',
        children: '1',
      })
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        nights: 2,
        roomTypes: [
          {
            availableRooms: 4,
          },
        ],
      },
    });
    expect(reservationsService.searchAvailability).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.objectContaining({
        checkInDate: '2026-06-10',
        checkOutDate: '2026-06-12',
        adults: 2,
        children: 1,
      }),
    );
    expect(reservationsService.getById).not.toHaveBeenCalled();
  });

  it('returns room type and room-level availability', async () => {
    await request(app.getHttpServer())
      .get('/api/reservations/availability/by-room-type')
      .query({
        checkInDate: '2026-06-10',
        checkOutDate: '2026-06-12',
        roomTypeId: '4',
      })
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(reservationsService.getAvailabilityByRoomType).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.objectContaining({
        roomTypeId: 4,
      }),
    );

    await request(app.getHttpServer())
      .get('/api/reservations/availability/rooms')
      .query({
        checkInDate: '2026-06-10',
        checkOutDate: '2026-06-12',
        roomTypeId: '4',
      })
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(reservationsService.listAvailableRooms).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.objectContaining({
        roomTypeId: 4,
      }),
    );
  });

  it('returns booking calendar entries', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/reservations/calendar')
      .query({
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        roomTypeId: '4',
      })
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        roomTypeId: 4,
        items: [
          {
            id: 20,
          },
        ],
      },
    });
    expect(reservationsService.getBookingCalendar).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.objectContaining({
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        roomTypeId: 4,
      }),
    );
  });

  it('updates and confirms reservations through lifecycle routes', async () => {
    const updateResponse = await request(app.getHttpServer())
      .patch('/api/reservations/20')
      .set('Authorization', 'Bearer admin-token')
      .send({
        internalNotes: 'Updated note',
      })
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      success: true,
      data: {
        id: 20,
        internalNotes: 'Updated note',
      },
    });
    expect(reservationsService.update).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      20,
      {
        internalNotes: 'Updated note',
      },
    );

    await request(app.getHttpServer())
      .patch('/api/reservations/20/confirm')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(reservationsService.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      20,
    );
  });

  it('cancels and marks no-show reservations through lifecycle routes', async () => {
    const cancelResponse = await request(app.getHttpServer())
      .patch('/api/reservations/20/cancel')
      .set('Authorization', 'Bearer admin-token')
      .send({
        cancellationReason: 'Guest cancelled',
      })
      .expect(200);

    expect(cancelResponse.body).toMatchObject({
      success: true,
      data: {
        status: ReservationStatus.CANCELLED,
      },
    });
    expect(reservationsService.cancel).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      20,
      {
        cancellationReason: 'Guest cancelled',
      },
    );

    await request(app.getHttpServer())
      .patch('/api/reservations/20/no-show')
      .set('Authorization', 'Bearer admin-token')
      .send({
        reason: 'Guest did not arrive',
      })
      .expect(200);

    expect(reservationsService.markNoShow).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      20,
      {
        reason: 'Guest did not arrive',
      },
    );
  });

  it('adds, updates, and removes reservation rooms through nested routes', async () => {
    await request(app.getHttpServer())
      .post('/api/reservations/20/rooms')
      .set('Authorization', 'Bearer admin-token')
      .send({
        roomTypeId: 4,
        rate: 150,
      })
      .expect(201);

    expect(reservationsService.addRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      20,
      {
        roomTypeId: 4,
        rate: 150,
      },
    );

    await request(app.getHttpServer())
      .patch('/api/reservations/20/rooms/30')
      .set('Authorization', 'Bearer admin-token')
      .send({
        roomId: null,
      })
      .expect(200);

    expect(reservationsService.updateRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      20,
      30,
      {
        roomId: null,
      },
    );

    await request(app.getHttpServer())
      .delete('/api/reservations/20/rooms/30')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(reservationsService.removeRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      20,
      30,
    );
  });
});
