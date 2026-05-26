import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

describe('ReservationsController', () => {
  let controller: ReservationsController;
  let reservationsService: {
    create: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: null,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    reservationsService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        {
          provide: ReservationsService,
          useValue: reservationsService,
        },
        {
          provide: PrismaService,
          useValue: {
            role: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<ReservationsController>(ReservationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates reservation creation', () => {
    const dto = {
      guestId: 12,
      checkInDate: '2026-06-10',
      checkOutDate: '2026-06-12',
      rooms: [
        {
          roomTypeId: 4,
        },
      ],
    };

    controller.create(currentUser, dto);

    expect(reservationsService.create).toHaveBeenCalledWith(currentUser, dto);
  });
});
