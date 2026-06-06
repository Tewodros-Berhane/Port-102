import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const maintenanceTicketPhotoSelect = {
  id: true,
  ticketId: true,
  uploadedByUserId: true,
  url: true,
  description: true,
  createdAt: true,
  uploadedBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
      status: true,
    },
  },
} as const;

export type MaintenanceTicketPhotoRecord =
  Prisma.MaintenanceTicketPhotoGetPayload<{
    select: typeof maintenanceTicketPhotoSelect;
  }>;

@Injectable()
export class MaintenanceTicketPhotosRepository {
  constructor(private readonly prisma: PrismaService) {}

  createPhoto(data: Prisma.MaintenanceTicketPhotoUncheckedCreateInput) {
    return this.prisma.maintenanceTicketPhoto.create({
      data,
      select: maintenanceTicketPhotoSelect,
    });
  }
}
