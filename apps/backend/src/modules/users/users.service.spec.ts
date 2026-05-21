import { Test, TestingModule } from '@nestjs/testing';

import { ConfigService } from '@nestjs/config';
import { compare } from 'bcryptjs';

import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: {
    findAssignableRole: jest.Mock;
    findActiveDepartment: jest.Mock;
    findByEmailForManagement: jest.Mock;
    createUser: jest.Mock;
    createHotelMembership: jest.Mock;
    listHotelUsers: jest.Mock;
    findHotelUserProfile: jest.Mock;
    updateUserProfile: jest.Mock;
    updateHotelMembership: jest.Mock;
    updatePassword: jest.Mock;
    revokeActiveRefreshTokensForUser: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    hotelId: 10,
    membershipId: 20,
    roleKey: 'HOTEL_ADMIN',
    tokenVersion: 0,
  };
  const now = new Date('2026-05-21T00:00:00.000Z');
  const hotelUserProfile = {
    id: 30,
    status: 'ACTIVE',
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
    user: {
      id: 5,
      email: 'user@demo-hotel.com',
      fullName: 'Demo User',
      phone: '+251911111111',
      status: 'ACTIVE',
      passwordHash: 'secret-hash',
      createdAt: now,
      updatedAt: now,
    },
    role: {
      id: 2,
      key: 'hotel-admin',
      systemKey: 'HOTEL_ADMIN',
      name: 'Hotel Admin',
    },
    department: {
      id: 3,
      key: 'FRONT_OFFICE',
      name: 'Front Office',
    },
  };

  beforeEach(async () => {
    usersRepository = {
      findAssignableRole: jest.fn().mockResolvedValue({ id: 2 }),
      findActiveDepartment: jest.fn().mockResolvedValue({ id: 3 }),
      findByEmailForManagement: jest.fn(),
      createUser: jest.fn().mockResolvedValue({ id: 5 }),
      createHotelMembership: jest.fn(),
      listHotelUsers: jest.fn().mockResolvedValue([1, [hotelUserProfile]]),
      findHotelUserProfile: jest.fn().mockResolvedValue(hotelUserProfile),
      updateUserProfile: jest.fn(),
      updateHotelMembership: jest.fn().mockResolvedValue({ count: 1 }),
      updatePassword: jest.fn(),
      revokeActiveRefreshTokensForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: usersRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(4),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a hotel-scoped user and membership without returning password hashes', async () => {
    const result = await service.create(currentUser, {
      email: ' USER@DEMO-HOTEL.COM ',
      fullName: ' Demo User ',
      password: 'Password123!',
      phone: ' +251911111111 ',
      roleId: 2,
      departmentId: 3,
    });

    expect(usersRepository.findAssignableRole).toHaveBeenCalledWith(10, 2);
    expect(usersRepository.findActiveDepartment).toHaveBeenCalledWith(10, 3);
    expect(usersRepository.findByEmailForManagement).toHaveBeenCalledWith(
      'user@demo-hotel.com',
    );
    expect(usersRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@demo-hotel.com',
        fullName: 'Demo User',
        phone: '+251911111111',
      }),
    );
    await expect(
      compare(
        'Password123!',
        usersRepository.createUser.mock.calls[0][0].passwordHash,
      ),
    ).resolves.toBe(true);
    expect(usersRepository.createHotelMembership).toHaveBeenCalledWith({
      userId: 5,
      hotelId: 10,
      roleId: 2,
      departmentId: 3,
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('user.passwordHash');
  });

  it('rejects creating a user already assigned to the current hotel', async () => {
    usersRepository.findByEmailForManagement.mockResolvedValue({
      id: 5,
      status: 'ACTIVE',
      hotelUsers: [
        {
          hotelId: 10,
        },
      ],
    });

    await expect(
      service.create(currentUser, {
        email: 'user@demo-hotel.com',
        fullName: 'Demo User',
        password: 'Password123!',
        roleId: 2,
      }),
    ).rejects.toThrow('User already belongs to this hotel.');
  });

  it('lists hotel users with pagination metadata', async () => {
    const result = await service.list(currentUser, {
      page: 2,
      pageSize: 10,
      search: ' demo ',
    });

    expect(usersRepository.listHotelUsers).toHaveBeenCalledWith({
      hotelId: 10,
      skip: 10,
      take: 10,
      search: 'demo',
    });
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    expect(result.items[0]).toMatchObject({
      id: 5,
      email: 'user@demo-hotel.com',
      membership: {
        id: 30,
        role: {
          key: 'HOTEL_ADMIN',
        },
      },
    });
    expect(result.items[0]).not.toHaveProperty('passwordHash');
  });

  it('rejects users outside the current hotel', async () => {
    usersRepository.findHotelUserProfile.mockResolvedValue(null);

    await expect(service.getById(currentUser, 5)).rejects.toThrow(
      'User was not found in this hotel.',
    );
  });

  it('updates user profile and current hotel department', async () => {
    usersRepository.findByEmailForManagement.mockResolvedValue(null);

    await service.update(currentUser, 5, {
      email: ' UPDATED@DEMO-HOTEL.COM ',
      fullName: ' Updated User ',
      phone: null,
      departmentId: 3,
    });

    expect(usersRepository.updateUserProfile).toHaveBeenCalledWith(5, {
      email: 'updated@demo-hotel.com',
      fullName: 'Updated User',
      phone: null,
    });
    expect(usersRepository.updateHotelMembership).toHaveBeenCalledWith(10, 5, {
      departmentId: 3,
    });
  });

  it('rejects role assignment from another hotel', async () => {
    usersRepository.findAssignableRole.mockResolvedValue(null);

    await expect(
      service.assignRole(currentUser, 5, {
        roleId: 99,
      }),
    ).rejects.toThrow('Role is not assignable to this hotel.');
  });

  it('deactivates and activates the current hotel membership', async () => {
    await service.deactivate(currentUser, 5);
    await service.activate(currentUser, 5);

    expect(usersRepository.updateHotelMembership).toHaveBeenNthCalledWith(
      1,
      10,
      5,
      { status: 'INACTIVE' },
    );
    expect(usersRepository.updateHotelMembership).toHaveBeenNthCalledWith(
      2,
      10,
      5,
      { status: 'ACTIVE' },
    );
  });

  it('resets a password and revokes active refresh tokens', async () => {
    await service.resetPassword(currentUser, 5, {
      newPassword: 'NewPassword123!',
    });

    expect(usersRepository.updatePassword).toHaveBeenCalledWith(
      5,
      expect.any(String),
    );
    await expect(
      compare(
        'NewPassword123!',
        usersRepository.updatePassword.mock.calls[0][1],
      ),
    ).resolves.toBe(true);
    expect(
      usersRepository.revokeActiveRefreshTokensForUser,
    ).toHaveBeenCalledWith(5);
  });
});
