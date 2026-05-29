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
