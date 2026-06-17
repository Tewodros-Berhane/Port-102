import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, SupplierStatus } from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { GetSuppliersQueryDto } from './dto/get-suppliers-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import {
  SupplierRecord,
  SuppliersRepository,
} from './repositories/suppliers.repository';

@Injectable()
export class ProcurementService {
  constructor(
    private readonly suppliersRepository: SuppliersRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async createSupplier(
    currentUser: CurrentUserPayload,
    createSupplierDto: CreateSupplierDto,
  ) {
    const supplierNumber = this.normalizeSupplierNumber(
      createSupplierDto.supplierNumber,
    );
    const duplicate =
      await this.suppliersRepository.findBySupplierNumber(supplierNumber);

    if (duplicate) {
      throw new ConflictException('Supplier number already exists.');
    }

    const supplier = await this.suppliersRepository.createSupplier({
      supplierNumber,
      name: this.normalizeRequiredString(
        createSupplierDto.name,
        'Supplier name is required.',
      ),
      contactName: this.normalizeOptionalString(createSupplierDto.contactName),
      phone: this.normalizeOptionalString(createSupplierDto.phone),
      email: this.normalizeOptionalString(createSupplierDto.email),
      address: this.normalizeOptionalString(createSupplierDto.address),
      notes: this.normalizeOptionalString(createSupplierDto.notes),
    });

    await this.recordSupplierAudit(
      currentUser,
      'procurement.suppliers.created',
      supplier,
      this.supplierAuditSnapshot(supplier),
    );

    return supplier;
  }

  async listSuppliers(
    _currentUser: CurrentUserPayload,
    query: GetSuppliersQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [total, suppliers] = await this.suppliersRepository.listSuppliers({
      skip: (page - 1) * limit,
      take: limit,
      search: this.normalizeOptionalString(query.search) ?? undefined,
      status: query.status,
    });

    return {
      items: suppliers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSupplierById(_currentUser: CurrentUserPayload, supplierId: number) {
    return this.findRequiredSupplier(supplierId);
  }

  async updateSupplier(
    currentUser: CurrentUserPayload,
    supplierId: number,
    updateSupplierDto: UpdateSupplierDto,
  ) {
    const supplier = await this.findRequiredSupplier(supplierId);
    const data: Prisma.SupplierUncheckedUpdateInput = {};

    if (updateSupplierDto.supplierNumber !== undefined) {
      const supplierNumber = this.normalizeSupplierNumber(
        updateSupplierDto.supplierNumber,
      );

      if (supplierNumber !== supplier.supplierNumber) {
        const duplicate = await this.suppliersRepository.findBySupplierNumber(
          supplierNumber,
          supplier.id,
        );

        if (duplicate) {
          throw new ConflictException('Supplier number already exists.');
        }
      }

      data.supplierNumber = supplierNumber;
    }

    if (updateSupplierDto.name !== undefined) {
      data.name = this.normalizeRequiredString(
        updateSupplierDto.name,
        'Supplier name is required.',
      );
    }

    if (updateSupplierDto.contactName !== undefined) {
      data.contactName = this.normalizeOptionalString(
        updateSupplierDto.contactName,
      );
    }

    if (updateSupplierDto.phone !== undefined) {
      data.phone = this.normalizeOptionalString(updateSupplierDto.phone);
    }

    if (updateSupplierDto.email !== undefined) {
      data.email = this.normalizeOptionalString(updateSupplierDto.email);
    }

    if (updateSupplierDto.address !== undefined) {
      data.address = this.normalizeOptionalString(updateSupplierDto.address);
    }

    if (updateSupplierDto.notes !== undefined) {
      data.notes = this.normalizeOptionalString(updateSupplierDto.notes);
    }

    if (Object.keys(data).length === 0) {
      return supplier;
    }

    const updatedSupplier = await this.suppliersRepository.updateSupplier(
      supplier.id,
      data,
    );

    await this.recordSupplierAudit(
      currentUser,
      'procurement.suppliers.updated',
      updatedSupplier,
      {
        previous: this.supplierAuditSnapshot(supplier),
        current: this.supplierAuditSnapshot(updatedSupplier),
      },
    );

    return updatedSupplier;
  }

  async deactivateSupplier(
    currentUser: CurrentUserPayload,
    supplierId: number,
  ) {
    const supplier = await this.findRequiredSupplier(supplierId);

    if (supplier.status === SupplierStatus.INACTIVE) {
      return supplier;
    }

    const updatedSupplier = await this.suppliersRepository.updateSupplier(
      supplier.id,
      {
        status: SupplierStatus.INACTIVE,
      },
    );

    await this.recordSupplierAudit(
      currentUser,
      'procurement.suppliers.deactivated',
      updatedSupplier,
      {
        previousStatus: supplier.status,
        status: updatedSupplier.status,
      },
    );

    return updatedSupplier;
  }

  private async findRequiredSupplier(supplierId: number) {
    const supplier = await this.suppliersRepository.findSupplier(supplierId);

    if (!supplier) {
      throw new NotFoundException('Supplier was not found.');
    }

    return supplier;
  }

  private normalizeSupplierNumber(value: string) {
    return this.normalizeRequiredString(
      value,
      'Supplier number is required.',
    ).toUpperCase();
  }

  private normalizeRequiredString(value: string, message: string) {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(message);
    }

    return normalized;
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = value?.trim();

    return normalized || null;
  }

  private supplierAuditSnapshot(supplier: SupplierRecord) {
    return {
      supplierNumber: supplier.supplierNumber,
      name: supplier.name,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      status: supplier.status,
      notes: supplier.notes,
    };
  }

  private recordSupplierAudit(
    currentUser: CurrentUserPayload,
    action: string,
    supplier: SupplierRecord,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'Supplier',
      entityId: supplier.id.toString(),
      metadata,
    });
  }
}
