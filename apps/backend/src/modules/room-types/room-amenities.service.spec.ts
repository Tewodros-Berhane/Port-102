import { Test, TestingModule } from '@nestjs/testing';

import { RoomAmenitiesService } from './room-amenities.service';
import { RoomAmenitiesRepository } from './repositories/room-amenities.repository';

describe('RoomAmenitiesService', () => {
  let service: RoomAmenitiesService;
  let roomAmenitiesRepository: {
    createAmenity: jest.Mock;
    findByKey: jest.Mock;
    listAmenities: jest.Mock;
    findAmenity: jest.Mock;
    updateAmenity: jest.Mock;
  };

  const now = new Date('2026-05-25T00:00:00.000Z');
  const currentUser = {
    sub: 1,
    email: 'admin@demo-hotel.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: 3,
    tokenVersion: 0,
  };
  const amenity = {
    id: 7,
    name: 'Wi-Fi',
    key: 'wifi',
    description: 'Wireless internet',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(async () => {
    roomAmenitiesRepository = {
      createAmenity: jest.fn().mockResolvedValue(amenity),
      findByKey: jest.fn().mockResolvedValue(null),
      listAmenities: jest.fn().mockResolvedValue([1, [amenity]]),
      findAmenity: jest.fn().mockResolvedValue(amenity),
      updateAmenity: jest.fn().mockResolvedValue({
        ...amenity,
        name: 'Updated Wi-Fi',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomAmenitiesService,
        {
          provide: RoomAmenitiesRepository,
          useValue: roomAmenitiesRepository,
        },
      ],
    }).compile();

    service = module.get<RoomAmenitiesService>(RoomAmenitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates amenities with a unique normalized key', async () => {
    const result = await service.create(currentUser, {
      name: ' Wi-Fi ',
      key: ' WIFI ',
      description: ' Wireless internet ',
    });

    expect(result).toMatchObject({
      id: 7,
      key: 'wifi',
    });
    expect(roomAmenitiesRepository.findByKey).toHaveBeenCalledWith('wifi');
    expect(roomAmenitiesRepository.createAmenity).toHaveBeenCalledWith({
      name: 'Wi-Fi',
      key: 'wifi',
      description: 'Wireless internet',
    });
  });

  it('rejects duplicate amenity keys', async () => {
    roomAmenitiesRepository.findByKey.mockResolvedValue(amenity);

    await expect(
      service.create(currentUser, {
        name: 'Wi-Fi',
        key: 'wifi',
      }),
    ).rejects.toThrow('Amenity key already exists.');
  });

  it('rejects invalid amenity keys after normalization', async () => {
    await expect(
      service.create(currentUser, {
        name: 'Wi-Fi',
        key: 'wi fi',
      }),
    ).rejects.toThrow(
      'Amenity key may only contain letters, numbers, underscores, periods, and hyphens.',
    );
  });

  it('lists amenities with pagination and filters', async () => {
    await service.list(currentUser, {
      page: 2,
      limit: 10,
      search: ' wifi ',
      isActive: true,
    });

    expect(roomAmenitiesRepository.listAmenities).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      search: 'wifi',
      isActive: true,
    });
  });

  it('throws when an amenity is missing', async () => {
    roomAmenitiesRepository.findAmenity.mockResolvedValue(null);

    await expect(service.getById(currentUser, 404)).rejects.toThrow(
      'Room amenity was not found.',
    );
  });

  it('updates amenity fields and checks duplicate keys', async () => {
    await service.update(currentUser, 7, {
      name: ' Updated Wi-Fi ',
      key: 'FAST_WIFI',
      description: null,
    });

    expect(roomAmenitiesRepository.findByKey).toHaveBeenCalledWith(
      'fast_wifi',
      7,
    );
    expect(roomAmenitiesRepository.updateAmenity).toHaveBeenCalledWith(7, {
      name: 'Updated Wi-Fi',
      key: 'fast_wifi',
      description: null,
    });
  });

  it('soft-deactivates active amenities', async () => {
    roomAmenitiesRepository.updateAmenity.mockResolvedValue({
      ...amenity,
      isActive: false,
    });

    const result = await service.remove(currentUser, 7);

    expect(result).toMatchObject({
      id: 7,
      isActive: false,
    });
    expect(roomAmenitiesRepository.updateAmenity).toHaveBeenCalledWith(7, {
      isActive: false,
    });
  });
});
