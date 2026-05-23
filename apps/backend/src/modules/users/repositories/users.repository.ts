import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

const userProfileInclude = {
  role: true,
  department: true,
} as const;

const authUserInclude = {
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
} as const;

@Injectable()
export class UsersRepository {
  constructor(protected readonly prisma: PrismaService) {}

  findByEmailForLogin(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: authUserInclude,
    });
  }

  findActiveUserProfile(userId: number) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        status: 'ACTIVE',
        role: {
          isActive: true,
        },
      },
      include: authUserInclude,
    });
  }

  findAssignableRole(roleId: number) {
    return this.prisma.role.findFirst({
      where: {
        id: roleId,
        isActive: true,
      },
    });
  }

  findActiveDepartment(departmentId: number) {
    return this.prisma.department.findFirst({
      where: {
        id: departmentId,
        isActive: true,
      },
    });
  }

  findByEmailForManagement(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findByEmailForPasswordReset(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        status: true,
      },
    });
  }

  findByIdForPasswordChange(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        status: true,
      },
    });
  }

  createUser(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string | null;
    roleId: number;
    departmentId?: number | null;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  listUsers({
    skip,
    take,
    search,
  }: {
    skip: number;
    take: number;
    search?: string;
  }) {
    const where = {
      ...(search
        ? {
            OR: [
              {
                fullName: {
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
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take,
        include: userProfileInclude,
        orderBy: [
          {
            fullName: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      }),
    ]);
  }

  findUserProfile(userId: number) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: userProfileInclude,
    });
  }

  updateUserProfile(
    userId: number,
    data: {
      email?: string;
      fullName?: string;
      phone?: string | null;
      departmentId?: number | null;
      status?: 'ACTIVE' | 'INACTIVE';
      roleId?: number;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
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
