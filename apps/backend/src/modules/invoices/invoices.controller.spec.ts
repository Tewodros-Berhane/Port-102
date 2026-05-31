import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceStatus } from '../../generated/prisma/client';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

describe('InvoicesController', () => {
  let controller: InvoicesController;
  let invoicesService: {
    generate: jest.Mock;
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
    invoicesService = {
      generate: jest.fn(),
      list: jest.fn(),
      listByFolio: jest.fn(),
      getById: jest.fn(),
      void: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
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

    controller = module.get<InvoicesController>(InvoicesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates invoice generation', () => {
    const dto = {
      folioId: 70,
    };

    controller.generate(currentUser, dto);

    expect(invoicesService.generate).toHaveBeenCalledWith(currentUser, dto);
  });

  it('delegates invoice listing', () => {
    const query = {
      page: 2,
      limit: 10,
      status: InvoiceStatus.ISSUED,
    };

    controller.list(currentUser, query);

    expect(invoicesService.list).toHaveBeenCalledWith(currentUser, query);
  });

  it('delegates folio invoice listing', () => {
    const query = {
      page: 1,
      limit: 20,
    };

    controller.listByFolio(currentUser, 70, query);

    expect(invoicesService.listByFolio).toHaveBeenCalledWith(
      currentUser,
      70,
      query,
    );
  });

  it('delegates invoice lookup', () => {
    controller.getById(currentUser, 90);

    expect(invoicesService.getById).toHaveBeenCalledWith(currentUser, 90);
  });

  it('delegates invoice voiding', () => {
    const dto = {
      voidReason: 'Invoice regenerated with corrected folio totals.',
    };

    controller.void(currentUser, 90, dto);

    expect(invoicesService.void).toHaveBeenCalledWith(currentUser, 90, dto);
  });
});
