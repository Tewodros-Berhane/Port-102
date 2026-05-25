import { Test, TestingModule } from '@nestjs/testing';

import { RoomAmenitiesService } from './room-amenities.service';

describe('RoomAmenitiesService', () => {
  let service: RoomAmenitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomAmenitiesService],
    }).compile();

    service = module.get<RoomAmenitiesService>(RoomAmenitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
