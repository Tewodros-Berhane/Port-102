import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { ReservationCheckInsController } from './reservation-check-ins.controller';
import { StaysService } from './stays.service';

describe('ReservationCheckInsController', () => {
  let controller: ReservationCheckInsController;
  let staysService: {
    checkInReservation: jest.Mock;
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
    staysService = {
      checkInReservation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationCheckInsController],
      providers: [
        {
          provide: StaysService,
          useValue: staysService,
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

    controller = module.get<ReservationCheckInsController>(
      ReservationCheckInsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates reservation check-in to the stays service', () => {
    const dto = {
      roomAssignments: [
        {
          reservationRoomId: 30,
          roomId: 9,
        },
      ],
      notes: 'Guest arrived at front desk.',
    };

    controller.checkIn(currentUser, 20, dto);

    expect(staysService.checkInReservation).toHaveBeenCalledWith(
      currentUser,
      20,
      dto,
    );
  });
});
