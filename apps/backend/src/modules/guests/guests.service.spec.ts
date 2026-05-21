import { Test, TestingModule } from '@nestjs/testing';

import { GuestsService } from './guests.service';
import { GuestsRepository } from './repositories/guests.repository';

describe('GuestsService', () => {
  let service: GuestsService;
  let guestsRepository: {
    findGuestByEmail: jest.Mock;
    createGuest: jest.Mock;
    listGuests: jest.Mock;
    findGuestProfile: jest.Mock;
    updateGuest: jest.Mock;
  };

  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    hotelId: 10,
    membershipId: 20,
    roleKey: 'HOTEL_ADMIN',
    tokenVersion: 0,
  };
  const now = new Date('2026-05-22T00:00:00.000Z');
  const guestProfile = {
    id: 5,
    hotelId: 10,
    firstName: 'Demo',
    lastName: 'Guest',
    email: 'guest@demo-hotel.com',
    phone: '+251911111111',
    nationality: 'ET',
    documentNumber: 'PASSPORT-1',
    status: 'ACTIVE',
    preferences: {
      pillow: 'firm',
    },
    createdAt: now,
    updatedAt: now,
    user: null,
  };

  beforeEach(async () => {
    guestsRepository = {
      findGuestByEmail: jest.fn(),
      createGuest: jest.fn().mockResolvedValue(guestProfile),
      listGuests: jest.fn().mockResolvedValue([1, [guestProfile]]),
      findGuestProfile: jest.fn().mockResolvedValue(guestProfile),
      updateGuest: jest.fn().mockResolvedValue({ count: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestsService,
        {
          provide: GuestsRepository,
          useValue: guestsRepository,
        },
      ],
    }).compile();

    service = module.get<GuestsService>(GuestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a guest without a linked login user', async () => {
    const result = await service.create(currentUser, {
      firstName: ' Demo ',
      lastName: ' Guest ',
      email: ' GUEST@DEMO-HOTEL.COM ',
      phone: ' +251911111111 ',
      nationality: ' ET ',
      documentNumber: ' PASSPORT-1 ',
      preferences: {
        pillow: 'firm',
      },
    });

    expect(guestsRepository.findGuestByEmail).toHaveBeenCalledWith(
      10,
      'guest@demo-hotel.com',
    );
    expect(guestsRepository.createGuest).toHaveBeenCalledWith({
      hotelId: 10,
      firstName: 'Demo',
      lastName: 'Guest',
      email: 'guest@demo-hotel.com',
      phone: '+251911111111',
      nationality: 'ET',
      documentNumber: 'PASSPORT-1',
      preferences: {
        pillow: 'firm',
      },
    });
    expect(result).toMatchObject({
      id: 5,
      email: 'guest@demo-hotel.com',
      preferences: {
        pillow: 'firm',
      },
      user: null,
    });
  });

  it('rejects duplicate guest emails inside the same hotel', async () => {
    guestsRepository.findGuestByEmail.mockResolvedValue(guestProfile);

    await expect(
      service.create(currentUser, {
        firstName: 'Demo',
        lastName: 'Guest',
        email: 'guest@demo-hotel.com',
      }),
    ).rejects.toThrow('Guest email already exists in this hotel.');
  });

  it('lists guests with pagination metadata', async () => {
    const result = await service.list(currentUser, {
      page: 2,
      pageSize: 10,
      search: ' demo ',
      status: 'ACTIVE',
    });

    expect(guestsRepository.listGuests).toHaveBeenCalledWith({
      hotelId: 10,
      skip: 10,
      take: 10,
      search: 'demo',
      status: 'ACTIVE',
    });
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('rejects guest lookups outside the current hotel', async () => {
    guestsRepository.findGuestProfile.mockResolvedValue(null);

    await expect(service.getById(currentUser, 5)).rejects.toThrow(
      'Guest was not found in this hotel.',
    );
  });

  it('updates a guest profile and preferences in the current hotel', async () => {
    await service.update(currentUser, 5, {
      firstName: 'Updated',
      email: ' UPDATED@DEMO-HOTEL.COM ',
      preferences: {
        floor: 'high',
      },
    });

    expect(guestsRepository.findGuestByEmail).toHaveBeenCalledWith(
      10,
      'updated@demo-hotel.com',
    );
    expect(guestsRepository.updateGuest).toHaveBeenCalledWith(10, 5, {
      firstName: 'Updated',
      email: 'updated@demo-hotel.com',
      preferences: {
        floor: 'high',
      },
    });
  });

  it('allows clearing optional guest fields', async () => {
    await service.update(currentUser, 5, {
      email: null,
      phone: null,
      nationality: null,
      documentNumber: null,
      preferences: null,
    });

    expect(guestsRepository.updateGuest).toHaveBeenCalledWith(10, 5, {
      email: null,
      phone: null,
      nationality: null,
      documentNumber: null,
      preferences: null,
    });
  });
});
