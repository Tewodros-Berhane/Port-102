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

  findByIdForHotelSelection(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
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

  findActiveMembershipProfile(userId: number, membershipId: number) {
    return this.prisma.hotelUser.findFirst({
      where: {
        id: membershipId,
        userId,
        status: 'ACTIVE',
        hotel: {
          status: 'ACTIVE',
        },
        role: {
          isActive: true,
        },
      },
      include: {
        user: true,
        hotel: true,
        role: {
          include: {
            permissions: {
              where: {
                permission: {
                  isActive: true,
                },
              },
              include: {
                permission: {
                  select: {
                    key: true,
                  },
                },
              },
            },
          },
        },
        department: true,
      },
    });
  }

  findActiveMembershipsForUser(userId: number) {
    return this.prisma.hotelUser.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        hotel: {
          status: 'ACTIVE',
        },
        role: {
          isActive: true,
        },
      },
      include: {
        hotel: true,
        role: true,
        department: true,
      },
      orderBy: [
        {
          hotel: {
            name: 'asc',
          },
        },
        {
          id: 'asc',
        },
      ],
    });
  }

  findAssignableRole(hotelId: number, roleId: number) {
    return this.prisma.role.findFirst({
      where: {
        id: roleId,
        isActive: true,
        OR: [
          {
            hotelId: null,
          },
          {
            hotelId,
          },
        ],
      },
    });
  }

  findActiveDepartment(hotelId: number, departmentId: number) {
    return this.prisma.department.findFirst({
      where: {
        id: departmentId,
        hotelId,
        isActive: true,
      },
    });
  }

  findByEmailForManagement(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        hotelUsers: true,
      },
    });
  }

  createUser(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string | null;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  createHotelMembership(data: {
    userId: number;
    hotelId: number;
    roleId: number;
    departmentId?: number | null;
  }) {
    return this.prisma.hotelUser.create({
      data,
    });
  }

  listHotelUsers({
    hotelId,
    skip,
    take,
    search,
  }: {
    hotelId: number;
    skip: number;
    take: number;
    search?: string;
  }) {
    const where = {
      hotelId,
      ...(search
        ? {
            OR: [
              {
                user: {
                  fullName: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                user: {
                  email: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.hotelUser.count({ where }),
      this.prisma.hotelUser.findMany({
        where,
        skip,
        take,
        include: {
          user: true,
          role: true,
          department: true,
        },
        orderBy: [
          {
            user: {
              fullName: 'asc',
            },
          },
          {
            id: 'asc',
          },
        ],
      }),
    ]);
  }

  findHotelUserProfile(hotelId: number, userId: number) {
    return this.prisma.hotelUser.findFirst({
      where: {
        hotelId,
        userId,
      },
      include: {
        user: true,
        role: true,
        department: true,
      },
    });
  }

  updateUserProfile(
    userId: number,
    data: {
      email?: string;
      fullName?: string;
      phone?: string | null;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  updateHotelMembership(
    hotelId: number,
    userId: number,
    data: {
      roleId?: number;
      departmentId?: number | null;
      status?: 'ACTIVE' | 'INACTIVE';
    },
  ) {
    return this.prisma.hotelUser.updateMany({
      where: {
        hotelId,
        userId,
      },
      data,
    });
  }

  updatePassword(userId: number, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        tokenVersion: {
          increment: 1,
        },
      },
    });
  }

  revokeActiveRefreshTokensForUser(userId: number) {
    return this.prisma.refreshToken.updateMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });
  }
}
