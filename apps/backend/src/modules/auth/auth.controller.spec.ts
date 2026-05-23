import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    buildLoginResponse: jest.Mock;
    getMe: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    logoutAll: jest.Mock;
    changePassword: jest.Mock;
    forgotPassword: jest.Mock;
    resetPassword: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: 3,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    authService = {
      buildLoginResponse: jest.fn(),
      getMe: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      logoutAll: jest.fn(),
      changePassword: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('builds a login response from the local authenticated user', () => {
    const request = {
      user: {
        id: 1,
        email: 'admin@demo-hotel.com',
        fullName: 'Admin User',
        status: 'ACTIVE',
        tokenVersion: 0,
        role: { id: 2, key: 'HOTEL_ADMIN', name: 'Hotel Admin' },
        department: null,
        permissions: ['users.read'],
      },
    };
    const dto = {
      email: 'admin@demo-hotel.com',
      password: 'Password123!',
    };

    controller.login(request, dto);

    expect(authService.buildLoginResponse).toHaveBeenCalledWith(request.user);
  });

  it('returns current user context', () => {
    controller.me(currentUser);

    expect(authService.getMe).toHaveBeenCalledWith(currentUser);
  });

  it('delegates token lifecycle endpoints', () => {
    controller.refresh({ refreshToken: 'refresh-token' });
    controller.logout({ refreshToken: 'refresh-token' });
    controller.logoutAll(currentUser);

    expect(authService.refresh).toHaveBeenCalledWith('refresh-token');
    expect(authService.logout).toHaveBeenCalledWith('refresh-token');
    expect(authService.logoutAll).toHaveBeenCalledWith(currentUser);
  });

  it('delegates password lifecycle endpoints', () => {
    const changeDto = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    };
    const forgotDto = {
      email: 'admin@demo-hotel.com',
    };
    const resetDto = {
      token: 'reset-token',
      newPassword: 'NewPassword123!',
    };

    controller.changePassword(currentUser, changeDto);
    controller.forgotPassword(forgotDto);
    controller.resetPassword(resetDto);

    expect(authService.changePassword).toHaveBeenCalledWith(
      currentUser,
      changeDto,
    );
    expect(authService.forgotPassword).toHaveBeenCalledWith(forgotDto);
    expect(authService.resetPassword).toHaveBeenCalledWith(resetDto);
  });
});
