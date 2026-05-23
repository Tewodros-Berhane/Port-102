import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AuthTokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  createRefreshToken(data: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.refreshToken.create({
      data,
    });
  }

  findActiveRefreshTokenByHash(tokenHash: string) {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        status: 'ACTIVE',
      },
      include: {
        user: {
          include: {
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
        },
      },
    });
  }

  revokeRefreshTokenByHash(tokenHash: string) {
    return this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        status: 'ACTIVE',
      },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
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

  incrementUserTokenVersion(userId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    });
  }

  findJwtUser(userId: number) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        role: true,
      },
    });
  }
}
