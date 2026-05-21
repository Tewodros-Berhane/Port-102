import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const guestInclude = {
  user: {
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      status: true,
    },
  },
} as const;

@Injectable()
export class GuestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findGuestByEmail(hotelId: number, email: string) {
    return this.prisma.guest.findFirst({
      where: {
        hotelId,
        email,
      },
    });
  }

  createGuest(data: {
    hotelId: number;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    nationality?: string | null;
    documentNumber?: string | null;
    preferences?: Prisma.InputJsonValue | null;
  }) {
    return this.prisma.guest.create({
      data: {
        hotelId: data.hotelId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        nationality: data.nationality ?? null,
        documentNumber: data.documentNumber ?? null,
        ...(data.preferences === undefined
          ? {}
          : { preferences: data.preferences ?? Prisma.JsonNull }),
      },
      include: guestInclude,
    });
  }

  listGuests({
    hotelId,
    skip,
    take,
    search,
    status,
  }: {
    hotelId: number;
    skip: number;
    take: number;
    search?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  }) {
    const where = {
      hotelId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              {
                firstName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                lastName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                phone: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                documentNumber: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.guest.count({ where }),
      this.prisma.guest.findMany({
        where,
        skip,
        take,
        include: guestInclude,
        orderBy: [
          {
            lastName: 'asc',
          },
          {
            firstName: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      }),
    ]);
  }

  findGuestProfile(hotelId: number, guestId: number) {
    return this.prisma.guest.findFirst({
      where: {
        id: guestId,
        hotelId,
      },
      include: guestInclude,
    });
  }

  updateGuest(
    hotelId: number,
    guestId: number,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string | null;
      phone?: string | null;
      nationality?: string | null;
      documentNumber?: string | null;
      preferences?: Prisma.InputJsonValue | null;
      status?: 'ACTIVE' | 'INACTIVE';
    },
  ) {
    const { preferences, ...profileData } = data;

    return this.prisma.guest.updateMany({
      where: {
        id: guestId,
        hotelId,
      },
      data: {
        ...profileData,
        ...(preferences === undefined
          ? {}
          : { preferences: preferences ?? Prisma.JsonNull }),
      },
    });
  }
}
