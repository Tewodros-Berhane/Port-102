import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethod, PaymentStatus } from '../../generated/prisma/client';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: {
    record: jest.Mock;
    list: jest.Mock;
    listByFolio: jest.Mock;
    getById: jest.Mock;
    void: jest.Mock;
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
    paymentsService = {
      record: jest.fn(),
      list: jest.fn(),
      listByFolio: jest.fn(),
      getById: jest.fn(),
      void: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: paymentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(guard)
      .overrideGuard(PermissionsGuard)
      .useValue(guard)
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates payment recording', () => {
    const dto = {
      folioId: 70,
      amount: 150,
      method: PaymentMethod.CASH,
      generateReceipt: true,
    };

    controller.record(currentUser, dto);

    expect(paymentsService.record).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates payment listing', () => {
    const query = {
      page: 2,
      limit: 10,
      status: PaymentStatus.RECORDED,
    };

    controller.list(currentUser, query);

    expect(paymentsService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates folio payment listing', () => {
    const query = {
      page: 1,
      limit: 20,
    };

    controller.listByFolio(currentUser, 70, query);

    expect(paymentsService.listByFolio).toHaveBeenCalledWith(
      currentUser,
      70,
      query,
    );
  });

  it('delegates payment lookup', () => {
    controller.getById(currentUser, 90);

    expect(paymentsService.getById).toHaveBeenCalledWith(currentUser, 90);
  });

  it('delegates payment voiding', () => {
    const dto = {
      voidReason: 'Duplicate payment entry.',
    };

    controller.void(currentUser, 90, dto);

    expect(paymentsService.void).toHaveBeenCalledWith(currentUser, 90, dto);
  });
});
