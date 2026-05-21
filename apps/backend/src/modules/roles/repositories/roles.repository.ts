import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

const roleInclude = {
  permissions: {
    include: {
      permission: true,
    },
  },
} as const;

@Injectable()
export class RolesRepository {
  constructor(protected readonly prisma: PrismaService) {}

  listVisibleRoles(hotelId: number) {
    return this.prisma.role.findMany({
      where: {
        OR: [
          {
            isSystem: true,
            hotelId: null,
          },
          {
            hotelId,
          },
        ],
      },
      include: roleInclude,
      orderBy: [
        {
          isSystem: 'desc',
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  findVisibleRole(hotelId: number, roleId: number) {
    return this.prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [
          {
            isSystem: true,
            hotelId: null,
          },
          {
            hotelId,
          },
        ],
      },
      include: roleInclude,
    });
  }

  findHotelRoleByKey(hotelId: number, key: string) {
    return this.prisma.role.findFirst({
      where: {
        hotelId,
        key,
      },
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

  createCustomRole(data: {
    hotelId: number;
    key: string;
    name: string;
    description?: string | null;
    permissionIds: number[];
  }) {
    return this.prisma.$transaction(async (transaction) => {
      const role = await transaction.role.create({
        data: {
          hotelId: data.hotelId,
          key: data.key,
          name: data.name,
          description: data.description ?? null,
          isSystem: false,
          isActive: true,
        },
      });

      if (data.permissionIds.length > 0) {
        await transaction.rolePermission.createMany({
          data: data.permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }

      return transaction.role.findFirstOrThrow({
        where: {
          id: role.id,
        },
        include: roleInclude,
      });
    });
  }

  updateRole(
    roleId: number,
    data: {
      key?: string;
      name?: string;
      description?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.prisma.role.update({
      where: {
        id: roleId,
      },
      data,
      include: roleInclude,
    });
  }

  replaceRolePermissions(roleId: number, permissionIds: number[]) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.rolePermission.deleteMany({
        where: {
          roleId,
        },
      });

      if (permissionIds.length > 0) {
        await transaction.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }

      return transaction.role.findFirstOrThrow({
        where: {
          id: roleId,
        },
        include: roleInclude,
      });
    });
  }

  deleteRole(roleId: number) {
    return this.prisma.role.delete({
      where: {
        id: roleId,
      },
    });
  }
}
