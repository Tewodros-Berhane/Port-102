import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { GetDepartmentsQueryDto } from './dto/get-departments-query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import {
  DepartmentRecord,
  DepartmentsRepository,
} from './repositories/departments.repository';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly repository: DepartmentsRepository,
    private readonly auditLogs: AuditLogsService,
  ) {}
  async create(user: CurrentUserPayload, dto: CreateDepartmentDto) {
    const key = dto.key.trim().toUpperCase();
    const name = this.required(dto.name);
    if (await this.repository.findByKey(key))
      throw new ConflictException('Department key already exists.');
    const result = await this.repository.create({
      key,
      name,
      description: this.optional(dto.description),
    });
    await this.audit(user, 'departments.created', result, { key, name });
    return result;
  }
  async list(_user: CurrentUserPayload, query: GetDepartmentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [total, items] = await this.repository.list({
      skip: (page - 1) * limit,
      take: limit,
      search: this.optional(query.search) ?? undefined,
      isActive: query.isActive,
    });
    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
  async getById(_user: CurrentUserPayload, id: number) {
    return this.requiredDepartment(id);
  }
  async update(user: CurrentUserPayload, id: number, dto: UpdateDepartmentDto) {
    const existing = await this.requiredDepartment(id);
    const data: {
      key?: string;
      name?: string;
      description?: string | null;
      isActive?: boolean;
    } = {};
    if (dto.key !== undefined) {
      const key = dto.key.trim().toUpperCase();
      if (key !== existing.key && (await this.repository.findByKey(key, id)))
        throw new ConflictException('Department key already exists.');
      data.key = key;
    }
    if (dto.name !== undefined) data.name = this.required(dto.name);
    if (dto.description !== undefined)
      data.description = this.optional(dto.description);
    if (dto.isActive !== undefined) {
      if (!dto.isActive && existing.isActive)
        await this.ensureCanDeactivate(id);
      data.isActive = dto.isActive;
    }
    if (!Object.keys(data).length) return existing;
    const result = await this.repository.update(id, data);
    await this.audit(user, 'departments.updated', result, {
      previous: existing,
      changes: data,
    });
    return result;
  }
  async remove(user: CurrentUserPayload, id: number) {
    const existing = await this.requiredDepartment(id);
    if (!existing.isActive) return existing;
    await this.ensureCanDeactivate(id);
    const result = await this.repository.update(id, { isActive: false });
    await this.audit(user, 'departments.deactivated', result, {
      previous: { isActive: true },
      changes: { isActive: false },
    });
    return result;
  }
  private async requiredDepartment(id: number) {
    const result = await this.repository.findById(id);
    if (!result) throw new NotFoundException('Department was not found.');
    return result;
  }
  private async ensureCanDeactivate(id: number) {
    const linked = await this.repository.countActiveAssignments(id);
    if (linked.users || linked.employees)
      throw new BadRequestException(
        'Cannot deactivate a department with active users or employees assigned.',
      );
  }
  private audit(
    user: CurrentUserPayload,
    action: string,
    department: DepartmentRecord,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditLogs.record({
      actorUserId: user.sub,
      action,
      entityType: 'Department',
      entityId: String(department.id),
      metadata,
    });
  }
  private required(value: string) {
    const result = value.trim();
    if (!result) throw new BadRequestException('Department name is required.');
    return result;
  }
  private optional(value?: string | null) {
    return value?.trim() || null;
  }
}
