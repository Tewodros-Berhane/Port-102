import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

const employeeInclude = {
  department: true,
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
export class EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveDepartment(departmentId: number) {
    return this.prisma.department.findFirst({
      where: {
        id: departmentId,
        isActive: true,
      },
    });
  }

  findEmployeeByNumber(employeeNumber: string) {
    return this.prisma.employee.findFirst({
      where: {
        employeeNumber,
      },
    });
  }

  createEmployee(data: {
    departmentId?: number | null;
    employeeNumber?: string | null;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    jobTitle?: string | null;
    hireDate?: Date | null;
  }) {
    return this.prisma.employee.create({
      data,
      include: employeeInclude,
    });
  }

  listEmployees({
    skip,
    take,
    search,
    status,
  }: {
    skip: number;
    take: number;
    search?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  }) {
    const where = {
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
                employeeNumber: {
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
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        skip,
        take,
        include: employeeInclude,
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

  findEmployeeProfile(employeeId: number) {
    return this.prisma.employee.findUnique({
      where: {
        id: employeeId,
      },
      include: employeeInclude,
    });
  }

  updateEmployee(
    employeeId: number,
    data: {
      departmentId?: number | null;
      employeeNumber?: string | null;
      firstName?: string;
      lastName?: string;
      email?: string | null;
      phone?: string | null;
      jobTitle?: string | null;
      hireDate?: Date | null;
      status?: 'ACTIVE' | 'INACTIVE';
      userId?: number | null;
    },
  ) {
    return this.prisma.employee.updateMany({
      where: {
        id: employeeId,
      },
      data,
    });
  }

  findActiveUser(userId: number) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });
  }

  findEmployeeLinkedToUser(userId: number) {
    return this.prisma.employee.findUnique({
      where: {
        userId,
      },
    });
  }
}
