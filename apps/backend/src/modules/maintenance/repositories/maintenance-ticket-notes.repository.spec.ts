import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../prisma/prisma.service';
import { MaintenanceTicketNotesRepository } from './maintenance-ticket-notes.repository';

describe('MaintenanceTicketNotesRepository', () => {
  let repository: MaintenanceTicketNotesRepository;
  let prisma: {
    maintenanceTicketNote: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      maintenanceTicketNote: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceTicketNotesRepository,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    repository = module.get<MaintenanceTicketNotesRepository>(
      MaintenanceTicketNotesRepository,
    );
  });

  it('creates maintenance ticket notes through PrismaService', async () => {
    await repository.createNote({
      ticketId: 30,
      authorUserId: 1,
      note: 'Pump is blocked.',
    });

    expect(prisma.maintenanceTicketNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          ticketId: 30,
          authorUserId: 1,
          note: 'Pump is blocked.',
        },
        select: expect.objectContaining({
          author: expect.any(Object),
        }),
      }),
    );
  });
});
