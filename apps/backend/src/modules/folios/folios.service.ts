import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalRequestType,
  FolioLineItemType,
  FolioStatus,
  Prisma,
  StayStatus,
} from '../../generated/prisma/client';
import { ApprovalRequestsService } from '../approval-requests/approval-requests.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AddFolioLineItemDto } from './dto/add-folio-line-item.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { CreateFolioDto } from './dto/create-folio.dto';
import { GetFoliosQueryDto } from './dto/get-folios-query.dto';
import { UpdateFolioDto } from './dto/update-folio.dto';
import { VoidFolioLineItemDto } from './dto/void-folio-line-item.dto';
import {
  FolioLineItemRecord,
  FolioLineItemsRepository,
} from './repositories/folio-line-items.repository';
import {
  FolioRecord,
  FoliosRepository,
  FolioStayRecord,
} from './repositories/folios.repository';

const FRONT_DESK_SMALL_DISCOUNT_LIMIT_PERCENT = new Prisma.Decimal(10);

@Injectable()
export class FoliosService {
  constructor(
    private readonly foliosRepository: FoliosRepository,
    private readonly folioLineItemsRepository: FolioLineItemsRepository,
    private readonly auditLogsService: AuditLogsService,
    private readonly approvalRequestsService: ApprovalRequestsService,
  ) {}

  async create(
    currentUser: CurrentUserPayload,
    createFolioDto: CreateFolioDto,
  ) {
    return this.openForStay(currentUser, createFolioDto.stayId, {
      guestId: createFolioDto.guestId,
    });
  }

  async openForStay(
    currentUser: CurrentUserPayload,
    stayId: number,
    options: { guestId?: number } = {},
  ) {
    const stay = await this.findRequiredStayForFolio(stayId);
    this.ensureStayCanOpenFolio(stay, options.guestId);

    const existingFolio = await this.foliosRepository.findByStayId(stay.id);

    if (existingFolio) {
      return this.serializeFolio(existingFolio);
    }

    const folioNumber = await this.generateFolioNumber();
    let createdFolio = false;
    const folio = await this.foliosRepository.runInTransaction(
      async (client) => {
        const existingInTransaction = await this.foliosRepository.findByStayId(
          stay.id,
          client,
        );

        if (existingInTransaction) {
          return existingInTransaction;
        }

        createdFolio = true;

        return this.foliosRepository.createFolio(
          {
            folioNumber,
            stayId: stay.id,
            guestId: stay.guestId,
            openedByUserId: currentUser.sub,
          },
          client,
        );
      },
    );

    if (createdFolio) {
      await this.recordFolioAudit(currentUser, 'folios.created', folio, {
        folioNumber: folio.folioNumber,
        stayId: stay.id,
        stayNumber: stay.stayNumber,
        reservationId: stay.reservationId,
        guestId: stay.guestId,
      });
    }

    return this.serializeFolio(folio);
  }

  async list(_currentUser: CurrentUserPayload, query: GetFoliosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, folios] = await this.foliosRepository.listFolios({
      skip: (page - 1) * limit,
      take: limit,
      search: search ?? undefined,
      status: query.status,
      stayId: query.stayId,
      guestId: query.guestId,
      openedFrom: this.parseOptionalDate(query.openedFrom),
      openedTo: this.parseOptionalDate(query.openedTo),
    });

    return {
      items: folios.map((folio) => this.serializeFolio(folio)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(_currentUser: CurrentUserPayload, folioId: number) {
    const folio = await this.findRequiredFolio(folioId);

    return this.serializeFolio(folio);
  }

  async getByStayId(_currentUser: CurrentUserPayload, stayId: number) {
    const folio = await this.foliosRepository.findByStayId(stayId);

    if (!folio) {
      throw new NotFoundException('Folio was not found for the stay.');
    }

    return this.serializeFolio(folio);
  }

  async update(
    currentUser: CurrentUserPayload,
    folioId: number,
    updateFolioDto: UpdateFolioDto,
  ) {
    const folio = await this.findRequiredFolio(folioId);

    if (updateFolioDto.status === undefined) {
      return this.serializeFolio(folio);
    }

    if (updateFolioDto.status === FolioStatus.CLOSED) {
      throw new BadRequestException(
        'Use the close folio workflow to close a folio.',
      );
    }

    if (folio.status !== FolioStatus.OPEN) {
      throw new ConflictException('Only open folios can be updated.');
    }

    if (folio.status === updateFolioDto.status) {
      return this.serializeFolio(folio);
    }

    const updatedFolio = await this.foliosRepository.updateFolio(folio.id, {
      status: updateFolioDto.status,
    });

    await this.recordFolioAudit(currentUser, 'folios.updated', updatedFolio, {
      previousStatus: folio.status,
      status: updatedFolio.status,
      folioNumber: updatedFolio.folioNumber,
    });

    return this.serializeFolio(updatedFolio);
  }

  async addLineItem(
    currentUser: CurrentUserPayload,
    folioId: number,
    addFolioLineItemDto: AddFolioLineItemDto,
  ) {
    const folio = await this.findRequiredFolio(folioId);
    this.ensureFolioIsOpen(folio);
    this.ensureLineItemCanBeAdded(addFolioLineItemDto.type);

    const description = this.normalizeRequiredString(
      addFolioLineItemDto.description,
      'Line item description is required.',
    );
    const quantity = addFolioLineItemDto.quantity ?? 1;
    const unitAmount = new Prisma.Decimal(addFolioLineItemDto.unitAmount);
    const totalAmount = unitAmount.mul(quantity);
    const sourceType = this.normalizeOptionalString(
      addFolioLineItemDto.sourceType,
    );
    const {
      lineItem,
      folio: updatedFolio,
      lineItems,
    } = await this.foliosRepository.runInTransaction(async (client) => {
      const createdLineItem =
        await this.folioLineItemsRepository.createLineItem(
          {
            folioId: folio.id,
            type: addFolioLineItemDto.type,
            description,
            quantity,
            unitAmount: unitAmount.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            sourceType,
            sourceId: addFolioLineItemDto.sourceId ?? null,
            postedByUserId: currentUser.sub,
          },
          client,
        );
      const activeLineItems = await this.folioLineItemsRepository.listLineItems(
        {
          folioId: folio.id,
          includeVoided: false,
          client,
        },
      );
      const recalculatedFolio = await this.recalculateFolioTotals(
        folio,
        activeLineItems,
        client,
      );

      return {
        lineItem: createdLineItem,
        folio: recalculatedFolio,
        lineItems: activeLineItems,
      };
    });

    await this.recordFolioAudit(currentUser, 'folios.line_item_added', folio, {
      folioNumber: folio.folioNumber,
      lineItemId: lineItem.id,
      type: lineItem.type,
      description: lineItem.description,
      quantity: lineItem.quantity,
      unitAmount: this.serializeDecimal(lineItem.unitAmount),
      totalAmount: this.serializeDecimal(lineItem.totalAmount),
    });

    return this.serializeFolioSummary(updatedFolio, lineItems);
  }

  async applyDiscount(
    currentUser: CurrentUserPayload,
    folioId: number,
    applyDiscountDto: ApplyDiscountDto,
  ) {
    const folio = await this.findRequiredFolio(folioId);
    this.ensureFolioIsOpen(folio);

    const description = this.normalizeRequiredString(
      applyDiscountDto.description,
      'Discount description is required.',
    );
    const reason = this.normalizeOptionalString(applyDiscountDto.reason);
    const discount = this.resolveDiscountAmount(folio, applyDiscountDto);

    if (discount.requiresApproval) {
      const approvalRequest = await this.approvalRequestsService.create(
        currentUser,
        {
          type: ApprovalRequestType.LARGE_DISCOUNT,
          title: `Large folio discount for ${folio.folioNumber}`,
          reason: reason ?? undefined,
          payload: {
            folioId: folio.id,
            folioNumber: folio.folioNumber,
            stayId: folio.stayId,
            guestId: folio.guestId,
            description,
            requestedAmount: discount.amount.toFixed(2),
            requestedPercent: discount.percent.toFixed(2),
            subtotalAmount: discount.subtotalAmount.toFixed(2),
            existingDiscountAmount: folio.discountAmount.toFixed(2),
            remainingDiscountableAmount:
              discount.remainingDiscountableAmount.toFixed(2),
            smallDiscountLimitPercent:
              FRONT_DESK_SMALL_DISCOUNT_LIMIT_PERCENT.toFixed(2),
          },
        },
      );

      await this.recordFolioAudit(
        currentUser,
        'folios.discount_approval_requested',
        folio,
        {
          folioNumber: folio.folioNumber,
          approvalRequestId: approvalRequest.id,
          description,
          requestedAmount: discount.amount.toFixed(2),
          requestedPercent: discount.percent.toFixed(2),
          reason,
        },
      );

      return {
        status: 'APPROVAL_REQUIRED',
        approvalRequest,
      };
    }

    const { folio: updatedFolio, lineItems } =
      await this.foliosRepository.runInTransaction(async (client) => {
        await this.folioLineItemsRepository.createLineItem(
          {
            folioId: folio.id,
            type: FolioLineItemType.DISCOUNT,
            description,
            quantity: 1,
            unitAmount: discount.amount.toFixed(2),
            totalAmount: discount.amount.toFixed(2),
            sourceType: 'folio_discount',
            sourceId: null,
            postedByUserId: currentUser.sub,
          },
          client,
        );
        const activeLineItems =
          await this.folioLineItemsRepository.listLineItems({
            folioId: folio.id,
            includeVoided: false,
            client,
          });
        const recalculatedFolio = await this.recalculateFolioTotals(
          folio,
          activeLineItems,
          client,
        );

        return {
          folio: recalculatedFolio,
          lineItems: activeLineItems,
        };
      });

    await this.recordFolioAudit(currentUser, 'folios.discount_applied', folio, {
      folioNumber: folio.folioNumber,
      description,
      amount: discount.amount.toFixed(2),
      percent: discount.percent.toFixed(2),
      reason,
    });

    return this.serializeFolioSummary(updatedFolio, lineItems);
  }

  async voidLineItem(
    currentUser: CurrentUserPayload,
    folioId: number,
    lineItemId: number,
    voidFolioLineItemDto: VoidFolioLineItemDto,
  ) {
    const folio = await this.findRequiredFolio(folioId);
    this.ensureFolioIsOpen(folio);
    const lineItem =
      await this.folioLineItemsRepository.findLineItem(lineItemId);

    if (!lineItem || lineItem.folioId !== folio.id) {
      throw new NotFoundException('Folio line item was not found.');
    }

    if (lineItem.isVoided) {
      throw new ConflictException('Folio line item is already voided.');
    }

    const voidReason = this.normalizeRequiredString(
      voidFolioLineItemDto.voidReason,
      'Void reason is required.',
    );
    const {
      lineItem: voidedLineItem,
      folio: updatedFolio,
      lineItems,
    } = await this.foliosRepository.runInTransaction(async (client) => {
      const updatedLineItem =
        await this.folioLineItemsRepository.updateLineItem(
          lineItem.id,
          {
            isVoided: true,
            voidReason,
          },
          client,
        );
      const activeLineItems = await this.folioLineItemsRepository.listLineItems(
        {
          folioId: folio.id,
          includeVoided: false,
          client,
        },
      );
      const recalculatedFolio = await this.recalculateFolioTotals(
        folio,
        activeLineItems,
        client,
      );

      return {
        lineItem: updatedLineItem,
        folio: recalculatedFolio,
        lineItems: activeLineItems,
      };
    });

    await this.recordFolioAudit(currentUser, 'folios.line_item_voided', folio, {
      folioNumber: folio.folioNumber,
      lineItemId: voidedLineItem.id,
      type: voidedLineItem.type,
      previousTotalAmount: this.serializeDecimal(lineItem.totalAmount),
      voidReason,
    });

    return this.serializeFolioSummary(updatedFolio, lineItems);
  }

  async getSummary(_currentUser: CurrentUserPayload, folioId: number) {
    const folio = await this.findRequiredFolio(folioId);
    const lineItems = await this.folioLineItemsRepository.listLineItems({
      folioId: folio.id,
    });

    return this.serializeFolioSummary(folio, lineItems);
  }

  private async findRequiredFolio(folioId: number) {
    const folio = await this.foliosRepository.findFolio(folioId);

    if (!folio) {
      throw new NotFoundException('Folio was not found.');
    }

    return folio;
  }

  private ensureFolioIsOpen(folio: FolioRecord) {
    if (folio.status !== FolioStatus.OPEN) {
      throw new ConflictException('Only open folios can be changed.');
    }
  }

  private async findRequiredStayForFolio(stayId: number) {
    const stay = await this.foliosRepository.findStayForFolio(stayId);

    if (!stay) {
      throw new NotFoundException('Stay was not found.');
    }

    return stay;
  }

  private ensureStayCanOpenFolio(stay: FolioStayRecord, guestId?: number) {
    if (stay.status !== StayStatus.ACTIVE) {
      throw new ConflictException('Only active stays can open a folio.');
    }

    if (guestId !== undefined && guestId !== stay.guestId) {
      throw new BadRequestException('Folio guest must match the stay guest.');
    }
  }

  private ensureLineItemCanBeAdded(type: FolioLineItemType) {
    if (type === FolioLineItemType.DISCOUNT) {
      throw new BadRequestException(
        'Use the discount workflow to apply folio discounts.',
      );
    }
  }

  private resolveDiscountAmount(
    folio: FolioRecord,
    applyDiscountDto: ApplyDiscountDto,
  ) {
    const hasAmount =
      applyDiscountDto.amount !== undefined && applyDiscountDto.amount !== null;
    const hasPercent =
      applyDiscountDto.percent !== undefined &&
      applyDiscountDto.percent !== null;

    if (hasAmount === hasPercent) {
      throw new BadRequestException(
        'Provide either a discount amount or discount percent.',
      );
    }

    if (folio.subtotalAmount.lte(0)) {
      throw new ConflictException(
        'Cannot apply a discount before folio charges are posted.',
      );
    }

    const remainingDiscountableAmount = folio.subtotalAmount.minus(
      folio.discountAmount,
    );

    if (remainingDiscountableAmount.lte(0)) {
      throw new ConflictException(
        'Folio subtotal has already been fully discounted.',
      );
    }

    const amount = hasAmount
      ? new Prisma.Decimal(applyDiscountDto.amount!)
      : folio.subtotalAmount
          .mul(new Prisma.Decimal(applyDiscountDto.percent!))
          .div(100);
    const percent = hasPercent
      ? new Prisma.Decimal(applyDiscountDto.percent!)
      : amount.div(folio.subtotalAmount).mul(100);

    if (amount.lte(0) || percent.lte(0)) {
      throw new BadRequestException('Discount amount must be greater than 0.');
    }

    if (amount.gt(remainingDiscountableAmount)) {
      throw new BadRequestException(
        'Discount cannot exceed the remaining undiscounted subtotal.',
      );
    }

    return {
      amount,
      percent,
      subtotalAmount: folio.subtotalAmount,
      remainingDiscountableAmount,
      requiresApproval: percent.gt(FRONT_DESK_SMALL_DISCOUNT_LIMIT_PERCENT),
    };
  }

  private async recalculateFolioTotals(
    folio: FolioRecord,
    lineItems: FolioLineItemRecord[],
    client: Prisma.TransactionClient,
  ) {
    const totals = this.calculateFolioTotals(lineItems, folio.paidAmount);

    return this.foliosRepository.updateFolio(
      folio.id,
      {
        subtotalAmount: totals.subtotalAmount.toFixed(2),
        discountAmount: totals.discountAmount.toFixed(2),
        taxAmount: totals.taxAmount.toFixed(2),
        serviceAmount: totals.serviceAmount.toFixed(2),
        totalAmount: totals.totalAmount.toFixed(2),
        balanceAmount: totals.balanceAmount.toFixed(2),
      },
      client,
    );
  }

  private calculateFolioTotals(
    lineItems: FolioLineItemRecord[],
    paidAmount: Prisma.Decimal,
  ) {
    const zero = new Prisma.Decimal(0);
    let subtotalAmount = zero;
    let discountAmount = zero;
    let taxAmount = zero;
    let serviceAmount = zero;

    for (const lineItem of lineItems) {
      if (lineItem.isVoided) {
        continue;
      }

      if (lineItem.type === FolioLineItemType.DISCOUNT) {
        discountAmount = discountAmount.plus(lineItem.totalAmount.abs());
        continue;
      }

      if (lineItem.type === FolioLineItemType.TAX) {
        taxAmount = taxAmount.plus(lineItem.totalAmount);
        continue;
      }

      if (lineItem.type === FolioLineItemType.SERVICE_CHARGE) {
        serviceAmount = serviceAmount.plus(lineItem.totalAmount);
        continue;
      }

      subtotalAmount = subtotalAmount.plus(lineItem.totalAmount);
    }

    const totalAmount = subtotalAmount
      .minus(discountAmount)
      .plus(taxAmount)
      .plus(serviceAmount);
    const balanceAmount = totalAmount.minus(paidAmount);

    return {
      subtotalAmount,
      discountAmount,
      taxAmount,
      serviceAmount,
      totalAmount,
      balanceAmount,
    };
  }

  private async generateFolioNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (let attempt = 0; attempt < 5; attempt++) {
      const sequence = `${Date.now().toString().slice(-6)}${attempt}`.slice(-6);
      const folioNumber = `FOL-${datePart}-${sequence}`;
      const existingFolio =
        await this.foliosRepository.findByFolioNumber(folioNumber);

      if (!existingFolio) {
        return folioNumber;
      }
    }

    throw new ConflictException('Could not generate a unique folio number.');
  }

  private serializeFolio(folio: FolioRecord) {
    return {
      id: folio.id,
      folioNumber: folio.folioNumber,
      stayId: folio.stayId,
      guestId: folio.guestId,
      status: folio.status,
      subtotalAmount: this.serializeDecimal(folio.subtotalAmount),
      discountAmount: this.serializeDecimal(folio.discountAmount),
      taxAmount: this.serializeDecimal(folio.taxAmount),
      serviceAmount: this.serializeDecimal(folio.serviceAmount),
      totalAmount: this.serializeDecimal(folio.totalAmount),
      paidAmount: this.serializeDecimal(folio.paidAmount),
      balanceAmount: this.serializeDecimal(folio.balanceAmount),
      openedAt: folio.openedAt,
      closedAt: folio.closedAt,
      openedByUserId: folio.openedByUserId,
      closedByUserId: folio.closedByUserId,
      createdAt: folio.createdAt,
      updatedAt: folio.updatedAt,
      stay: folio.stay,
      guest: folio.guest,
      openedBy: folio.openedBy,
      closedBy: folio.closedBy,
    };
  }

  private serializeFolioSummary(
    folio: FolioRecord,
    lineItems: FolioLineItemRecord[],
  ) {
    return {
      folio: this.serializeFolio(folio),
      lineItems: lineItems.map((lineItem) => this.serializeLineItem(lineItem)),
      totals: {
        subtotalAmount: this.serializeDecimal(folio.subtotalAmount),
        discountAmount: this.serializeDecimal(folio.discountAmount),
        taxAmount: this.serializeDecimal(folio.taxAmount),
        serviceAmount: this.serializeDecimal(folio.serviceAmount),
        totalAmount: this.serializeDecimal(folio.totalAmount),
        paidAmount: this.serializeDecimal(folio.paidAmount),
        balanceAmount: this.serializeDecimal(folio.balanceAmount),
      },
    };
  }

  private serializeLineItem(lineItem: FolioLineItemRecord) {
    return {
      id: lineItem.id,
      folioId: lineItem.folioId,
      type: lineItem.type,
      description: lineItem.description,
      quantity: lineItem.quantity,
      unitAmount: this.serializeDecimal(lineItem.unitAmount),
      totalAmount: this.serializeDecimal(lineItem.totalAmount),
      isVoided: lineItem.isVoided,
      voidReason: lineItem.voidReason,
      sourceType: lineItem.sourceType,
      sourceId: lineItem.sourceId,
      postedByUserId: lineItem.postedByUserId,
      postedAt: lineItem.postedAt,
      createdAt: lineItem.createdAt,
      updatedAt: lineItem.updatedAt,
      postedBy: lineItem.postedBy,
    };
  }

  private recordFolioAudit(
    currentUser: CurrentUserPayload,
    action: string,
    folio: FolioRecord,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'Folio',
      entityId: String(folio.id),
      metadata,
    });
  }

  private parseDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid folio date.');
    }

    return date;
  }

  private parseOptionalDate(value?: string) {
    return value === undefined ? undefined : this.parseDate(value);
  }

  private serializeDecimal(value: Prisma.Decimal) {
    return value.toString();
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
}
