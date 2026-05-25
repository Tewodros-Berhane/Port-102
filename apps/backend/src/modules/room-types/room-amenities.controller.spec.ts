import { Test, TestingModule } from '@nestjs/testing';

import { RoomAmenitiesController } from './room-amenities.controller';

describe('RoomAmenitiesController', () => {
  let controller: RoomAmenitiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomAmenitiesController],
    }).compile();

    controller = module.get<RoomAmenitiesController>(RoomAmenitiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
