import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PermissionsRepository {
  constructor(protected readonly prisma: PrismaService) {}

  listActivePermissions() {
    return this.prisma.permission.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          category: 'asc',
        },
        {
          key: 'asc',
        },
      ],
    });
  }

  findActivePermissionsByKeys(keys: string[]) {
    return this.prisma.permission.findMany({
      where: {
        key: {
          in: keys,
        },
        isActive: true,
      },
      orderBy: {
        key: 'asc',
      },
    });
  }
}
