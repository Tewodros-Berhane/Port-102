import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../prisma/prisma.service';
import { MaintenanceTicketPhotosRepository } from './maintenance-ticket-photos.repository';

describe('MaintenanceTicketPhotosRepository', () => {
  let repository: MaintenanceTicketPhotosRepository;
  let prisma: {
    maintenanceTicketPhoto: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      maintenanceTicketPhoto: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceTicketPhotosRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<MaintenanceTicketPhotosRepository>(
      MaintenanceTicketPhotosRepository,
    );
  });

  it('creates maintenance ticket photos through PrismaService', async () => {
    await repository.createPhoto({
      ticketId: 30,
      uploadedByUserId: 1,
      url: 'https://files.example.com/leak.jpg',
      description: 'Leak below the AC.',
    });

    expect(prisma.maintenanceTicketPhoto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          ticketId: 30,
          uploadedByUserId: 1,
          url: 'https://files.example.com/leak.jpg',
          description: 'Leak below the AC.',
        },
        select: expect.objectContaining({
          uploadedBy: expect.any(Object),
        }),
      }),
    );
  });
});
