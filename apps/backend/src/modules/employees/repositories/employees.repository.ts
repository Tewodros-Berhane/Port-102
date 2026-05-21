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

  findActiveDepartment(hotelId: number, departmentId: number) {
    return this.prisma.department.findFirst({
      where: {
        id: departmentId,
        hotelId,
        isActive: true,
      },
    });
  }

  findEmployeeByNumber(hotelId: number, employeeNumber: string) {
    return this.prisma.employee.findFirst({
      where: {
        hotelId,
        employeeNumber,
      },
    });
  }

  createEmployee(data: {
    hotelId: number;
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

  findEmployeeProfile(hotelId: number, employeeId: number) {
    return this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        hotelId,
      },
      include: employeeInclude,
    });
  }

  updateEmployee(
    hotelId: number,
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
        hotelId,
      },
      data,
    });
  }

  findHotelUser(hotelId: number, userId: number) {
    return this.prisma.hotelUser.findFirst({
      where: {
        hotelId,
        userId,
        status: 'ACTIVE',
        user: {
          status: 'ACTIVE',
        },
      },
      include: {
        user: true,
      },
    });
  }

  findEmployeeLinkedToUser(hotelId: number, userId: number) {
    return this.prisma.employee.findFirst({
      where: {
        hotelId,
        userId,
      },
    });
  }
}
