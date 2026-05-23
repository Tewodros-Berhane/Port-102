import { Test, TestingModule } from '@nestjs/testing';

import { GuestsService } from './guests.service';
import { GuestsRepository } from './repositories/guests.repository';

describe('GuestsService', () => {
  let service: GuestsService;
  let guestsRepository: {
    createGuest: jest.Mock;
    listGuests: jest.Mock;
    findGuestProfile: jest.Mock;
    updateGuest: jest.Mock;
  };

  const now = new Date('2026-05-23T00:00:00.000Z');
  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: 3,
    tokenVersion: 0,
  };
  const guest = {
    id: 5,
    firstName: 'Demo',
    lastName: 'Guest',
    email: 'guest@example.com',
    phone: null,
    nationality: null,
    documentNumber: null,
    status: 'ACTIVE',
    preferences: { pillow: 'firm' },
    createdAt: now,
    updatedAt: now,
    user: null,
  };

  beforeEach(async () => {
    guestsRepository = {
      createGuest: jest.fn().mockResolvedValue(guest),
      listGuests: jest.fn().mockResolvedValue([1, [guest]]),
      findGuestProfile: jest.fn().mockResolvedValue(guest),
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

  it('creates guest profiles without hotel ownership or global email uniqueness checks', async () => {
    await service.create(currentUser, {
      firstName: ' Demo ',
      lastName: ' Guest ',
      email: ' GUEST@EXAMPLE.COM ',
      preferences: { pillow: 'firm' },
    });

    expect(guestsRepository.createGuest).toHaveBeenCalledWith({
      firstName: 'Demo',
      lastName: 'Guest',
      email: 'guest@example.com',
      phone: null,
      nationality: null,
      documentNumber: null,
      preferences: { pillow: 'firm' },
    });
  });

  it('lists guests without hotel filters', async () => {
    await service.list(currentUser, {
      page: 2,
      pageSize: 10,
      search: ' demo ',
      status: 'ACTIVE',
    });

    expect(guestsRepository.listGuests).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'demo',
      status: 'ACTIVE',
    });
  });

  it('throws when a guest is missing', async () => {
    guestsRepository.findGuestProfile.mockResolvedValue(null);

    await expect(service.getById(currentUser, 404)).rejects.toThrow(
      'Guest was not found.',
    );
  });

  it('updates a guest profile directly', async () => {
    await service.update(currentUser, 5, {
      firstName: ' Updated ',
      email: ' UPDATED@EXAMPLE.COM ',
      preferences: null,
    });

    expect(guestsRepository.updateGuest).toHaveBeenCalledWith(5, {
      firstName: 'Updated',
      email: 'updated@example.com',
      preferences: null,
    });
  });
});
