import { Test, TestingModule } from '@nestjs/testing';

import { ReceiptStatus } from '../../../generated/prisma/client';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InvoicesService } from '../invoices.service';
import { ReceiptsController } from './receipts.controller';

describe('ReceiptsController', () => {
  let controller: ReceiptsController;
  let invoicesService: {
    generateReceipt: jest.Mock;
    listReceipts: jest.Mock;
    listReceiptsByFolio: jest.Mock;
    getReceiptById: jest.Mock;
    voidReceipt: jest.Mock;
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
    invoicesService = {
      generateReceipt: jest.fn(),
      listReceipts: jest.fn(),
      listReceiptsByFolio: jest.fn(),
      getReceiptById: jest.fn(),
      voidReceipt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiptsController],
      providers: [
        {
          provide: InvoicesService,
          useValue: invoicesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(guard)
      .overrideGuard(PermissionsGuard)
      .useValue(guard)
      .compile();

    controller = module.get<ReceiptsController>(ReceiptsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates receipt generation', () => {
    const dto = {
      folioId: 70,
      paymentId: 95,
    };

    controller.generate(currentUser, dto);

    expect(invoicesService.generateReceipt).toHaveBeenCalledWith(
      currentUser,
      dto,
    );
  });

  it('delegates receipt listing', () => {
    const query = {
      page: 2,
      limit: 10,
      status: ReceiptStatus.ISSUED,
    };

    controller.list(currentUser, query);

    expect(invoicesService.listReceipts).toHaveBeenCalledWith(
      currentUser,
      query,
    );
  });

  it('delegates folio receipt listing', () => {
    const query = {
      page: 1,
      limit: 20,
    };

    controller.listByFolio(currentUser, 70, query);

    expect(invoicesService.listReceiptsByFolio).toHaveBeenCalledWith(
      currentUser,
      70,
      query,
    );
  });

  it('delegates receipt lookup', () => {
    controller.getById(currentUser, 100);

    expect(invoicesService.getReceiptById).toHaveBeenCalledWith(
      currentUser,
      100,
    );
  });

  it('delegates receipt voiding', () => {
    const dto = {
      voidReason: 'Receipt issued against the wrong payment.',
    };

    controller.void(currentUser, 100, dto);

    expect(invoicesService.voidReceipt).toHaveBeenCalledWith(
      currentUser,
      100,
      dto,
    );
  });
});
