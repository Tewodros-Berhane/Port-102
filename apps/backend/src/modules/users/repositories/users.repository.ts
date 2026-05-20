import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(protected readonly prisma: PrismaService) {}

  findByEmailForLogin(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        hotelUsers: {
          include: {
            hotel: true,
            role: true,
            department: true,
          },
        },
      },
    });
  }
}
