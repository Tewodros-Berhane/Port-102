import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AuthTokensRepository {
  constructor(private readonly prisma: PrismaService) {}

  createRefreshToken(data: {
    userId: number;
    hotelUserId: number;
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
        user: true,
        hotelUser: {
          include: {
            hotel: true,
            role: true,
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

  findJwtMembership(userId: number, membershipId: number) {
    return this.prisma.hotelUser.findFirst({
      where: {
        id: membershipId,
        userId,
      },
      include: {
        user: true,
        hotel: true,
        role: true,
      },
    });
  }
}
