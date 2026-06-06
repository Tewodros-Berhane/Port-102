import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const maintenanceTicketNoteSelect = {
  id: true,
  ticketId: true,
  authorUserId: true,
  note: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      email: true,
      fullName: true,
      status: true,
    },
  },
} as const;

export type MaintenanceTicketNoteRecord =
  Prisma.MaintenanceTicketNoteGetPayload<{
    select: typeof maintenanceTicketNoteSelect;
  }>;

@Injectable()
export class MaintenanceTicketNotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  createNote(data: Prisma.MaintenanceTicketNoteUncheckedCreateInput) {
    return this.prisma.maintenanceTicketNote.create({
      data,
      select: maintenanceTicketNoteSelect,
    });
  }
}
