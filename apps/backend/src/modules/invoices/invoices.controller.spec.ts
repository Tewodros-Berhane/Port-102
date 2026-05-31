import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceStatus } from '../../generated/prisma/client';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

describe('InvoicesController', () => {
  let controller: InvoicesController;
  const invoicesService = {};
  const guard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
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
});
