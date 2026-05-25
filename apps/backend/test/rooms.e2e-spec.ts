import {
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { REQUIRED_PERMISSIONS_KEY } from '../src/common/decorators/permissions.decorator';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { configureApplication } from '../src/app.setup';
import {
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
} from '../src/generated/prisma/client';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../src/modules/auth/types/current-user-payload.type';
import { FloorsService } from '../src/modules/floors/floors.service';
import { RoomTypesService } from '../src/modules/room-types/room-types.service';
import { RoomsService } from '../src/modules/rooms/rooms.service';

type TestUser = CurrentUserPayload & {
  permissions: string[];
};

type RequestWithTestUser = {
  headers: {
    authorization?: string;
  };
  user?: TestUser;
};

const now = '2026-05-26T00:00:00.000Z';
const allRoomInventoryPermissions = [
  'floors.create',
  'floors.read',
  'room_types.create',
  'room_types.read',
  'rooms.create',
  'rooms.read',
  'rooms.status.read',
  'rooms.status.update',
  'rooms.out_of_order.mark',
  'rooms.out_of_order.clear',
  'rooms.availability.read',
];

const adminUser: TestUser = {
  sub: 1,
  email: 'admin@demo-hotel.com',
  roleKey: 'HOTEL_ADMIN',
  roleId: 2,
  departmentId: null,
  tokenVersion: 0,
  permissions: allRoomInventoryPermissions,
};

const limitedUser: TestUser = {
  ...adminUser,
  sub: 2,
  email: 'limited@demo-hotel.com',
  permissions: ['rooms.read'],
};

const testUsersByToken = new Map<string, TestUser>([
  ['admin-token', adminUser],
  ['limited-token', limitedUser],
]);

const floor = {
  id: 1,
  name: 'First Floor',
  number: 1,
  description: 'Main guest room floor.',
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

const roomType = {
  id: 2,
  name: 'Deluxe King',
  code: 'DLX-KING',
  description: 'Large king room.',
  baseOccupancy: 2,
  maxOccupancy: 3,
  baseRate: '125.50',
  isActive: true,
  createdAt: now,
  updatedAt: now,
  amenities: [],
};

const room = {
  id: 3,
  roomNumber: '101',
  displayName: 'Deluxe King 101',
  floorId: 1,
  roomTypeId: 2,
  occupancyStatus: RoomOccupancyStatus.VACANT,
  cleaningStatus: RoomCleaningStatus.CLEAN,
  maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
  notes: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
  floor: {
    id: 1,
    number: 1,
    name: 'First Floor',
    isActive: true,
  },
  roomType: {
    id: 2,
    name: 'Deluxe King',
    code: 'DLX-KING',
    baseOccupancy: 2,
    maxOccupancy: 3,
    baseRate: '125.50',
    isActive: true,
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

describe('Room inventory API (e2e)', () => {
  let app: INestApplication;

  const floorsService = {
    create: jest.fn(),
  };
  const roomTypesService = {
    create: jest.fn(),
  };
  const roomsService = {
    create: jest.fn(),
    list: jest.fn(),
    updateStatus: jest.fn(),
    markOutOfOrder: jest.fn(),
    clearOutOfOrder: jest.fn(),
    getAvailabilitySummary: jest.fn(),
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
      .overrideProvider(FloorsService)
      .useValue(floorsService)
      .overrideProvider(RoomTypesService)
      .useValue(roomTypesService)
      .overrideProvider(RoomsService)
      .useValue(roomsService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    floorsService.create.mockResolvedValue(floor);
    roomTypesService.create.mockResolvedValue(roomType);
    roomsService.create.mockResolvedValue(room);
    roomsService.list.mockResolvedValue({
      items: [room],
      pagination: {
        page: 2,
        limit: 1,
        total: 3,
        totalPages: 3,
      },
    });
    roomsService.updateStatus.mockResolvedValue({
      ...room,
      cleaningStatus: RoomCleaningStatus.DIRTY,
    });
    roomsService.markOutOfOrder.mockResolvedValue({
      ...room,
      maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
    });
    roomsService.clearOutOfOrder.mockResolvedValue(room);
    roomsService.getAvailabilitySummary.mockResolvedValue({
      total: 3,
      active: 3,
      inactive: 0,
      sellable: 2,
      unavailable: 1,
      occupied: 0,
      dirty: 1,
      criteria: {
        isActive: true,
        occupancyStatus: RoomOccupancyStatus.VACANT,
        cleaningStatuses: [
          RoomCleaningStatus.CLEAN,
          RoomCleaningStatus.INSPECTED,
        ],
        maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated room inventory requests', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/floors')
      .send({
        name: 'First Floor',
        number: 1,
      })
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 401,
      message: 'Authentication required.',
    });
    expect(floorsService.create).not.toHaveBeenCalled();
  });

  it('rejects users without the required permission', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/floors')
      .set('Authorization', 'Bearer limited-token')
      .send({
        name: 'First Floor',
        number: 1,
      })
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 403,
      message: 'Missing required permission.',
    });
    expect(floorsService.create).not.toHaveBeenCalled();
  });

  it('allows a permitted hotel admin to create a floor', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/floors')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'First Floor',
        number: 1,
        description: 'Main guest room floor.',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 201,
      data: {
        id: 1,
        name: 'First Floor',
        number: 1,
      },
      path: '/api/floors',
    });
    expect(floorsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      {
        name: 'First Floor',
        number: 1,
        description: 'Main guest room floor.',
      },
    );
  });

  it('allows a permitted hotel admin to create a room type', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/room-types')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Deluxe King',
        code: 'DLX-KING',
        description: 'Large king room.',
        baseOccupancy: 2,
        maxOccupancy: 3,
        baseRate: 125.5,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 201,
      data: {
        id: 2,
        code: 'DLX-KING',
        baseOccupancy: 2,
        maxOccupancy: 3,
      },
      path: '/api/room-types',
    });
    expect(roomTypesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.objectContaining({
        name: 'Deluxe King',
        code: 'DLX-KING',
        baseOccupancy: 2,
        maxOccupancy: 3,
        baseRate: 125.5,
      }),
    );
  });

  it('allows a permitted hotel admin to create a room', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/rooms')
      .set('Authorization', 'Bearer admin-token')
      .send({
        roomNumber: '101',
        displayName: 'Deluxe King 101',
        floorId: 1,
        roomTypeId: 2,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 201,
      data: {
        id: 3,
        roomNumber: '101',
        floorId: 1,
        roomTypeId: 2,
      },
      path: '/api/rooms',
    });
    expect(roomsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      {
        roomNumber: '101',
        displayName: 'Deluxe King 101',
        floorId: 1,
        roomTypeId: 2,
      },
    );
  });

  it('supports room list pagination and query transformation', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/rooms')
      .query({
        page: '2',
        limit: '1',
        isActive: 'true',
        floorId: '1',
        roomTypeId: '2',
      })
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 200,
      data: {
        items: [
          {
            id: 3,
            roomNumber: '101',
          },
        ],
        pagination: {
          page: 2,
          limit: 1,
          total: 3,
          totalPages: 3,
        },
      },
      path: '/api/rooms?page=2&limit=1&isActive=true&floorId=1&roomTypeId=2',
    });
    expect(roomsService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      expect.objectContaining({
        page: 2,
        limit: 1,
        isActive: true,
        floorId: 1,
        roomTypeId: 2,
      }),
    );
  });

  it('updates room status through the status endpoint', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/rooms/3/status')
      .set('Authorization', 'Bearer admin-token')
      .send({
        cleaningStatus: RoomCleaningStatus.DIRTY,
        reason: 'Guest checked out.',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 200,
      data: {
        id: 3,
        cleaningStatus: RoomCleaningStatus.DIRTY,
      },
      path: '/api/rooms/3/status',
    });
    expect(roomsService.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      3,
      {
        cleaningStatus: RoomCleaningStatus.DIRTY,
        reason: 'Guest checked out.',
      },
    );
  });

  it('marks and clears a room out of order', async () => {
    const markResponse = await request(app.getHttpServer())
      .patch('/api/rooms/3/mark-out-of-order')
      .set('Authorization', 'Bearer admin-token')
      .send({
        reason: 'AC repair.',
      })
      .expect(200);

    expect(markResponse.body).toMatchObject({
      success: true,
      data: {
        id: 3,
        maintenanceStatus: RoomMaintenanceStatus.OUT_OF_ORDER,
      },
      path: '/api/rooms/3/mark-out-of-order',
    });
    expect(roomsService.markOutOfOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      3,
      {
        reason: 'AC repair.',
      },
    );

    const clearResponse = await request(app.getHttpServer())
      .patch('/api/rooms/3/clear-out-of-order')
      .set('Authorization', 'Bearer admin-token')
      .send({
        reason: 'Repair complete.',
      })
      .expect(200);

    expect(clearResponse.body).toMatchObject({
      success: true,
      data: {
        id: 3,
        maintenanceStatus: RoomMaintenanceStatus.AVAILABLE,
      },
      path: '/api/rooms/3/clear-out-of-order',
    });
    expect(roomsService.clearOutOfOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
      3,
      {
        reason: 'Repair complete.',
      },
    );
  });

  it('returns the physical room availability summary', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/rooms/availability/summary')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      statusCode: 200,
      data: {
        total: 3,
        active: 3,
        sellable: 2,
        unavailable: 1,
      },
      path: '/api/rooms/availability/summary',
    });
    expect(roomsService.getAvailabilitySummary).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
      }),
    );
  });
});
