import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const departmentSelect = {
  id: true,
  key: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;
export type DepartmentRecord = Prisma.DepartmentGetPayload<{
  select: typeof departmentSelect;
}>;

@Injectable()
export class DepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { key: string; name: string; description?: string | null }) {
    return this.prisma.department.create({
      data: { ...data, description: data.description ?? null },
      select: departmentSelect,
    });
  }

  findByKey(key: string, excludeId?: number) {
    return this.prisma.department.findFirst({
      where: { key, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: departmentSelect,
    });
  }

  findById(id: number) {
    return this.prisma.department.findUnique({
      where: { id },
      select: departmentSelect,
    });
  }

  list({
    skip,
    take,
    search,
    isActive,
  }: {
    skip: number;
    take: number;
    search?: string;
    isActive?: boolean;
  }) {
    const where: Prisma.DepartmentWhereInput = {
      ...(isActive === undefined ? {} : { isActive }),
      ...(search
        ? {
            OR: [
              { key: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return Promise.all([
      this.prisma.department.count({ where }),
      this.prisma.department.findMany({
        where,
        skip,
        take,
        select: departmentSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
    ]);
  }

  update(
    id: number,
    data: {
      key?: string;
      name?: string;
      description?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.prisma.department.update({
      where: { id },
      data,
      select: departmentSelect,
    });
  }

  async countActiveAssignments(id: number) {
    const [users, employees] = await Promise.all([
      this.prisma.user.count({ where: { departmentId: id, status: 'ACTIVE' } }),
      this.prisma.employee.count({
        where: { departmentId: id, status: 'ACTIVE' },
      }),
    ]);
    return { users, employees };
  }
}
