import { Test, TestingModule } from '@nestjs/testing';
import { FolioLineItemType } from '../../generated/prisma/client';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FoliosController } from './folios.controller';
import { FoliosService } from './folios.service';

describe('FoliosController', () => {
  let controller: FoliosController;
  let foliosService: {
    create: jest.Mock;
    list: jest.Mock;
    getByStayId: jest.Mock;
    getById: jest.Mock;
    update: jest.Mock;
    close: jest.Mock;
    getSummary: jest.Mock;
    addLineItem: jest.Mock;
    applyDiscount: jest.Mock;
    voidLineItem: jest.Mock;
  };
  const guard = {
    canActivate: jest.fn(() => true),
  };

  const currentUser = {
    sub: 1,
    email: 'frontdesk@demo-hotel.com',
    roleKey: 'FRONT_DESK_CASHIER',
    roleId: 4,
    departmentId: null,
    tokenVersion: 0,
  };

  beforeEach(async () => {
    foliosService = {
      create: jest.fn(),
      list: jest.fn(),
      getByStayId: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      getSummary: jest.fn(),
      addLineItem: jest.fn(),
      applyDiscount: jest.fn(),
      voidLineItem: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoliosController],
      providers: [
        {
          provide: FoliosService,
          useValue: foliosService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(guard)
      .overrideGuard(PermissionsGuard)
      .useValue(guard)
      .compile();

    controller = module.get<FoliosController>(FoliosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates folio creation', () => {
    const dto = {
      stayId: 40,
      guestId: 12,
    };

    controller.create(currentUser, dto);

    expect(foliosService.create).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates folio listing', () => {
    const query = {
      page: 2,
      limit: 10,
      search: 'FOL',
    };

    controller.list(currentUser, query);

    expect(foliosService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates stay folio lookup', () => {
    controller.getByStayId(currentUser, 40);

    expect(foliosService.getByStayId).toHaveBeenCalledWith(currentUser, 40);
  });

  it('delegates folio detail lookup', () => {
    controller.getById(currentUser, 70);

    expect(foliosService.getById).toHaveBeenCalledWith(currentUser, 70);
  });

  it('delegates folio updates', () => {
    const dto = {
      status: 'VOIDED' as const,
    };

    controller.update(currentUser, 70, dto);

    expect(foliosService.update).toHaveBeenCalledWith(currentUser, 70, dto);
  });

  it('delegates folio summary lookup', () => {
    controller.getSummary(currentUser, 70);

    expect(foliosService.getSummary).toHaveBeenCalledWith(currentUser, 70);
  });

  it('delegates adding a line item', () => {
    const dto = {
      type: FolioLineItemType.MANUAL_CHARGE,
      description: 'Extra bed charge',
      quantity: 2,
      unitAmount: 100,
    };

    controller.addLineItem(currentUser, 70, dto);

    expect(foliosService.addLineItem).toHaveBeenCalledWith(
      currentUser,
      70,
      dto,
    );
  });

  it('delegates applying a discount', () => {
    const dto = {
      description: 'Service recovery discount',
      percent: 10,
      reason: 'Room readiness was delayed.',
    };

    controller.applyDiscount(currentUser, 70, dto);

    expect(foliosService.applyDiscount).toHaveBeenCalledWith(
      currentUser,
      70,
      dto,
    );
  });

  it('delegates voiding a line item', () => {
    const dto = {
      voidReason: 'Wrong folio.',
    };

    controller.voidLineItem(currentUser, 70, 80, dto);

    expect(foliosService.voidLineItem).toHaveBeenCalledWith(
      currentUser,
      70,
      80,
      dto,
    );
  });
});
