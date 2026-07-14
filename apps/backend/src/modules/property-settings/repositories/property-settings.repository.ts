import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
@Injectable()
export class PropertySettingsRepository {
  constructor(private readonly prisma: PrismaService) {}
  find() {
    return this.prisma.hotel.findUnique({ where: { id: 1 } });
  }
  initialize() {
    return this.prisma.hotel.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, name: 'Port-102 Hotel' },
    });
  }
  update(data: Prisma.HotelUpdateInput) {
    return this.prisma.hotel.update({ where: { id: 1 }, data });
  }
}
