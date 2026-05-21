import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    buildLoginResponse: jest.Mock;
    getMe: jest.Mock;
    getMyHotels: jest.Mock;
    selectHotel: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      buildLoginResponse: jest.fn(),
      getMe: jest.fn(),
      getMyHotels: jest.fn(),
      selectHotel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: PrismaService,
          useValue: {
            hotelUser: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns current user context', () => {
    const currentUser = {
      sub: 1,
      email: 'admin@demo-hotel.com',
      hotelId: 1,
      membershipId: 10,
      roleKey: 'HOTEL_ADMIN',
      tokenVersion: 0,
    };

    controller.me(currentUser);

    expect(authService.getMe).toHaveBeenCalledWith(currentUser);
  });

  it('returns hotels available to the current user', () => {
    const currentUser = {
      sub: 1,
      email: 'admin@demo-hotel.com',
      hotelId: 1,
      membershipId: 10,
      roleKey: 'HOTEL_ADMIN',
      tokenVersion: 0,
    };

    controller.myHotels(currentUser);

    expect(authService.getMyHotels).toHaveBeenCalledWith(currentUser);
  });

  it('selects a hotel from a hotel selection token', () => {
    controller.selectHotel({
      hotelId: 2,
      hotelSelectionToken: 'selection-token',
    });

    expect(authService.selectHotel).toHaveBeenCalledWith('selection-token', 2);
  });
});
