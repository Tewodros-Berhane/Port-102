import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { LinkEmployeeUserDto } from './dto/link-employee-user.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesRepository } from './repositories/employees.repository';

type EmployeeProfile = {
  id: number;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  status: string;
  hireDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  department: {
    id: number;
    key: string;
    name: string;
  } | null;
  user: {
    id: number;
    email: string;
    fullName: string;
    phone: string | null;
    status: string;
  } | null;
};

@Injectable()
export class EmployeesService {
  constructor(private readonly employeesRepository: EmployeesRepository) {}

  async create(
    _currentUser: CurrentUserPayload,
    createEmployeeDto: CreateEmployeeDto,
  ) {
    await this.ensureAssignableDepartment(createEmployeeDto.departmentId);
    await this.ensureEmployeeNumberAvailable(createEmployeeDto.employeeNumber);

    const employee = await this.employeesRepository.createEmployee({
      departmentId: createEmployeeDto.departmentId ?? null,
      employeeNumber: this.normalizeOptionalString(
        createEmployeeDto.employeeNumber,
      ),
      firstName: createEmployeeDto.firstName.trim(),
      lastName: createEmployeeDto.lastName.trim(),
      email: this.normalizeOptionalEmail(createEmployeeDto.email),
      phone: this.normalizeOptionalString(createEmployeeDto.phone),
      jobTitle: this.normalizeOptionalString(createEmployeeDto.jobTitle),
      hireDate: this.parseOptionalDate(createEmployeeDto.hireDate),
    });

    return this.serializeEmployee(employee);
  }

  async list(_currentUser: CurrentUserPayload, query: ListEmployeesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, employees] = await this.employeesRepository.listEmployees({
      skip: (page - 1) * pageSize,
      take: pageSize,
      search: search ?? undefined,
      status: query.status,
    });

    return {
      items: employees.map((employee) => this.serializeEmployee(employee)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(_currentUser: CurrentUserPayload, employeeId: number) {
    const employee = await this.findRequiredEmployee(employeeId);

    return this.serializeEmployee(employee);
  }

  async update(
    currentUser: CurrentUserPayload,
    employeeId: number,
    updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const employee = await this.findRequiredEmployee(employeeId);

    await this.ensureAssignableDepartment(updateEmployeeDto.departmentId);
    await this.ensureEmployeeNumberAvailable(
      updateEmployeeDto.employeeNumber,
      employee.id,
    );

    const data: {
      departmentId?: number | null;
      employeeNumber?: string | null;
      firstName?: string;
      lastName?: string;
      email?: string | null;
      phone?: string | null;
      jobTitle?: string | null;
      hireDate?: Date | null;
    } = {};

    if (updateEmployeeDto.departmentId !== undefined) {
      data.departmentId = updateEmployeeDto.departmentId ?? null;
    }

    if (updateEmployeeDto.employeeNumber !== undefined) {
      data.employeeNumber = this.normalizeOptionalString(
        updateEmployeeDto.employeeNumber,
      );
    }

    if (updateEmployeeDto.firstName !== undefined) {
      data.firstName = updateEmployeeDto.firstName.trim();
    }

    if (updateEmployeeDto.lastName !== undefined) {
      data.lastName = updateEmployeeDto.lastName.trim();
    }

    if (updateEmployeeDto.email !== undefined) {
      data.email = this.normalizeOptionalEmail(updateEmployeeDto.email);
    }

    if (updateEmployeeDto.phone !== undefined) {
      data.phone = this.normalizeOptionalString(updateEmployeeDto.phone);
    }

    if (updateEmployeeDto.jobTitle !== undefined) {
      data.jobTitle = this.normalizeOptionalString(updateEmployeeDto.jobTitle);
    }

    if (updateEmployeeDto.hireDate !== undefined) {
      data.hireDate = this.parseOptionalDate(updateEmployeeDto.hireDate);
    }

    if (Object.keys(data).length > 0) {
      await this.updateEmployeeOrThrow(employee.id, data);
    }

    return this.getById(currentUser, employee.id);
  }

  async deactivate(currentUser: CurrentUserPayload, employeeId: number) {
    await this.findRequiredEmployee(employeeId);
    await this.updateEmployeeOrThrow(employeeId, {
      status: 'INACTIVE',
    });

    return this.getById(currentUser, employeeId);
  }

  async linkUser(
    currentUser: CurrentUserPayload,
    employeeId: number,
    linkEmployeeUserDto: LinkEmployeeUserDto,
  ) {
    const employee = await this.findRequiredEmployee(employeeId);

    if (employee.user && employee.user.id !== linkEmployeeUserDto.userId) {
      throw new ConflictException('Employee is already linked to a user.');
    }

    const user = await this.employeesRepository.findActiveUser(
      linkEmployeeUserDto.userId,
    );

    if (!user) {
      throw new ForbiddenException('User is not active or does not exist.');
    }

    const linkedEmployee =
      await this.employeesRepository.findEmployeeLinkedToUser(
        linkEmployeeUserDto.userId,
      );

    if (linkedEmployee && linkedEmployee.id !== employee.id) {
      throw new ConflictException(
        'User is already linked to another employee.',
      );
    }

    await this.updateEmployeeOrThrow(employee.id, {
      userId: user.id,
    });

    return this.getById(currentUser, employee.id);
  }

  private async findRequiredEmployee(employeeId: number) {
    const employee =
      await this.employeesRepository.findEmployeeProfile(employeeId);

    if (!employee) {
      throw new NotFoundException('Employee was not found.');
    }

    return employee;
  }

  private async ensureAssignableDepartment(departmentId?: number | null) {
    if (departmentId === undefined || departmentId === null) {
      return null;
    }

    const department =
      await this.employeesRepository.findActiveDepartment(departmentId);

    if (!department) {
      throw new ForbiddenException('Department is not assignable.');
    }

    return department;
  }

  private async ensureEmployeeNumberAvailable(
    employeeNumber?: string | null,
    currentEmployeeId?: number,
  ) {
    const normalizedEmployeeNumber =
      this.normalizeOptionalString(employeeNumber);

    if (!normalizedEmployeeNumber) {
      return null;
    }

    const existingEmployee =
      await this.employeesRepository.findEmployeeByNumber(
        normalizedEmployeeNumber,
      );

    if (existingEmployee && existingEmployee.id !== currentEmployeeId) {
      throw new ConflictException('Employee number already exists.');
    }

    return existingEmployee;
  }

  private async updateEmployeeOrThrow(
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
    const result = await this.employeesRepository.updateEmployee(
      employeeId,
      data,
    );

    if (result.count === 0) {
      throw new NotFoundException('Employee was not found.');
    }
  }

  private serializeEmployee(employee: EmployeeProfile) {
    return {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      jobTitle: employee.jobTitle,
      status: employee.status,
      hireDate: employee.hireDate,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
      department: employee.department
        ? {
            id: employee.department.id,
            key: employee.department.key,
            name: employee.department.name,
          }
        : null,
      user: employee.user
        ? {
            id: employee.user.id,
            email: employee.user.email,
            fullName: employee.user.fullName,
            phone: employee.user.phone,
            status: employee.user.status,
          }
        : null,
    };
  }

  private normalizeOptionalEmail(email?: string | null) {
    return this.normalizeOptionalString(email)?.toLowerCase() ?? null;
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = value?.trim();

    return normalized || null;
  }

  private parseOptionalDate(value?: string | null) {
    return value ? new Date(value) : null;
  }
}
