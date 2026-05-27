import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

describe('ReservationsController', () => {
  let controller: ReservationsController;
  let reservationsService: {
    create: jest.Mock;
    list: jest.Mock;
    getById: jest.Mock;
    searchAvailability: jest.Mock;
    getAvailabilityByRoomType: jest.Mock;
    listAvailableRooms: jest.Mock;
    getBookingCalendar: jest.Mock;
    update: jest.Mock;
    confirm: jest.Mock;
    cancel: jest.Mock;
    markNoShow: jest.Mock;
    addRoom: jest.Mock;
    updateRoom: jest.Mock;
    removeRoom: jest.Mock;
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
      list: jest.fn(),
      getById: jest.fn(),
      searchAvailability: jest.fn(),
      getAvailabilityByRoomType: jest.fn(),
      listAvailableRooms: jest.fn(),
      getBookingCalendar: jest.fn(),
      update: jest.fn(),
      confirm: jest.fn(),
      cancel: jest.fn(),
      markNoShow: jest.fn(),
      addRoom: jest.fn(),
      updateRoom: jest.fn(),
      removeRoom: jest.fn(),
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

  it('delegates reservation listing', () => {
    const query = {
      page: 2,
      limit: 10,
      search: 'marta',
    };

    controller.list(currentUser, query);

    expect(reservationsService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates reservation detail lookup', () => {
    controller.getById(currentUser, 20);

    expect(reservationsService.getById).toHaveBeenCalledWith(currentUser, 20);
  });

  it('delegates availability search', () => {
    const query = {
      checkInDate: '2026-06-10',
      checkOutDate: '2026-06-12',
    };

    controller.searchAvailability(currentUser, query);

    expect(reservationsService.searchAvailability).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates availability by room type lookup', () => {
    const query = {
      checkInDate: '2026-06-10',
      checkOutDate: '2026-06-12',
      roomTypeId: 4,
    };

    controller.getAvailabilityByRoomType(currentUser, query);

    expect(reservationsService.getAvailabilityByRoomType).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates available room lookup', () => {
    const query = {
      checkInDate: '2026-06-10',
      checkOutDate: '2026-06-12',
      roomTypeId: 4,
    };

    controller.listAvailableRooms(currentUser, query);

    expect(reservationsService.listAvailableRooms).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates booking calendar lookup', () => {
    const query = {
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    };

    controller.getBookingCalendar(currentUser, query);

    expect(reservationsService.getBookingCalendar).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates reservation updates', () => {
    const dto = {
      internalNotes: 'Updated',
    };

    controller.update(currentUser, 20, dto);

    expect(reservationsService.update).toHaveBeenCalledWith(
      currentUser,
      20,
      dto,
    );
  });

  it('delegates reservation confirmation', () => {
    controller.confirm(currentUser, 20);

    expect(reservationsService.confirm).toHaveBeenCalledWith(currentUser, 20);
  });

  it('delegates reservation cancellation', () => {
    const dto = {
      cancellationReason: 'Guest cancelled.',
    };

    controller.cancel(currentUser, 20, dto);

    expect(reservationsService.cancel).toHaveBeenCalledWith(
      currentUser,
      20,
      dto,
    );
  });

  it('delegates no-show marking', () => {
    const dto = {
      reason: 'Guest did not arrive.',
    };

    controller.markNoShow(currentUser, 20, dto);

    expect(reservationsService.markNoShow).toHaveBeenCalledWith(
      currentUser,
      20,
      dto,
    );
  });

  it('delegates reservation room additions', () => {
    const dto = {
      roomTypeId: 4,
      roomId: 9,
    };

    controller.addRoom(currentUser, 20, dto);

    expect(reservationsService.addRoom).toHaveBeenCalledWith(
      currentUser,
      20,
      dto,
    );
  });

  it('delegates reservation room updates', () => {
    const dto = {
      roomId: null,
    };

    controller.updateRoom(currentUser, 20, 30, dto);

    expect(reservationsService.updateRoom).toHaveBeenCalledWith(
      currentUser,
      20,
      30,
      dto,
    );
  });

  it('delegates reservation room removal', () => {
    controller.removeRoom(currentUser, 20, 30);

    expect(reservationsService.removeRoom).toHaveBeenCalledWith(
      currentUser,
      20,
      30,
    );
  });
});
