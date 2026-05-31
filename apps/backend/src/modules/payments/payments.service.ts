import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  FolioStatus,
  PaymentStatus,
  Prisma,
  ReceiptStatus,
} from '../../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import {
  FolioRecord,
  FoliosRepository,
} from '../folios/repositories/folios.repository';
import {
  ReceiptRecord,
  ReceiptsRepository,
} from '../invoices/repositories/receipts.repository';
import { GetPaymentsQueryDto } from './dto/get-payments-query.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { VoidPaymentDto } from './dto/void-payment.dto';
import { PaymentsRepository } from './repositories/payments.repository';
import type { PaymentRecord } from './repositories/payments.repository';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly foliosRepository: FoliosRepository,
    private readonly receiptsRepository: ReceiptsRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async record(
    currentUser: CurrentUserPayload,
    recordPaymentDto: RecordPaymentDto,
  ) {
    const amount = new Prisma.Decimal(recordPaymentDto.amount);
    const reference = this.normalizeOptionalString(recordPaymentDto.reference);
    const notes = this.normalizeOptionalString(recordPaymentDto.notes);
    const paymentNumber = await this.generatePaymentNumber();
    const receiptNumber = recordPaymentDto.generateReceipt
      ? await this.generateReceiptNumber()
      : null;

    const result = await this.paymentsRepository.runInTransaction(
      async (client) => {
        const folio = await this.findRequiredFolio(
          recordPaymentDto.folioId,
          client,
        );
        this.ensureFolioCanAcceptPayment(folio);
        this.ensurePaymentAmountCanBeRecorded(amount, folio);

        const payment = await this.paymentsRepository.createPayment(
          {
            paymentNumber,
            folioId: folio.id,
            amount: amount.toFixed(2),
            method: recordPaymentDto.method,
            status: PaymentStatus.RECORDED,
            reference,
            notes,
            recordedByUserId: currentUser.sub,
          },
          client,
        );
        const updatedFolio = await this.foliosRepository.updateFolio(
          folio.id,
          {
            paidAmount: folio.paidAmount.plus(amount).toFixed(2),
            balanceAmount: folio.balanceAmount.minus(amount).toFixed(2),
          },
          client,
        );
        const receipt = receiptNumber
          ? await this.receiptsRepository.createReceipt(
              {
                receiptNumber,
                folioId: folio.id,
                paymentId: payment.id,
                status: ReceiptStatus.ISSUED,
                amount: amount.toFixed(2),
                issuedByUserId: currentUser.sub,
              },
              client,
            )
          : null;

        return {
          payment,
          folio: updatedFolio,
          receipt,
        };
      },
    );

    await this.recordPaymentAudit(
      currentUser,
      'payments.recorded',
      result.payment,
      {
        paymentNumber: result.payment.paymentNumber,
        folioId: result.payment.folioId,
        amount: this.serializeDecimal(result.payment.amount),
        method: result.payment.method,
        reference: result.payment.reference,
        receiptId: result.receipt?.id ?? null,
      },
    );

    if (result.receipt) {
      await this.recordReceiptAudit(
        currentUser,
        'receipts.generated',
        result.receipt,
        {
          receiptNumber: result.receipt.receiptNumber,
          paymentId: result.payment.id,
          folioId: result.receipt.folioId,
          amount: this.serializeDecimal(result.receipt.amount),
        },
      );
    }

    return {
      payment: this.serializePayment(result.payment),
      folio: this.serializeFolioBilling(result.folio),
      receipt: result.receipt ? this.serializeReceipt(result.receipt) : null,
    };
  }

  async list(_currentUser: CurrentUserPayload, query: GetPaymentsQueryDto) {
    return this.listPayments(query);
  }

  async listByFolio(
    _currentUser: CurrentUserPayload,
    folioId: number,
    query: GetPaymentsQueryDto,
  ) {
    await this.findRequiredFolio(folioId);

    return this.listPayments({
      ...query,
      folioId,
    });
  }

  async getById(_currentUser: CurrentUserPayload, paymentId: number) {
    const payment = await this.findRequiredPayment(paymentId);

    return this.serializePayment(payment);
  }

  async void(
    currentUser: CurrentUserPayload,
    paymentId: number,
    voidPaymentDto: VoidPaymentDto,
  ) {
    const voidReason = this.normalizeRequiredString(
      voidPaymentDto.voidReason,
      'Payment void reason is required.',
    );

    const result = await this.paymentsRepository.runInTransaction(
      async (client) => {
        const payment = await this.findRequiredPayment(paymentId, client);

        if (payment.status !== PaymentStatus.RECORDED) {
          throw new ConflictException('Only recorded payments can be voided.');
        }

        const folio = await this.findRequiredFolio(payment.folioId, client);
        const nextPaidAmount = folio.paidAmount.minus(payment.amount);

        if (nextPaidAmount.lt(0)) {
          throw new ConflictException(
            'Payment cannot be voided because folio paid amount would become negative.',
          );
        }

        const voidedPayment = await this.paymentsRepository.updatePayment(
          payment.id,
          {
            status: PaymentStatus.VOIDED,
            voidedAt: new Date(),
            voidReason,
          },
          client,
        );
        const updatedFolio = await this.foliosRepository.updateFolio(
          folio.id,
          {
            paidAmount: nextPaidAmount.toFixed(2),
            balanceAmount: folio.balanceAmount.plus(payment.amount).toFixed(2),
          },
          client,
        );

        return {
          payment: voidedPayment,
          folio: updatedFolio,
        };
      },
    );

    await this.recordPaymentAudit(
      currentUser,
      'payments.voided',
      result.payment,
      {
        paymentNumber: result.payment.paymentNumber,
        folioId: result.payment.folioId,
        amount: this.serializeDecimal(result.payment.amount),
        voidReason,
      },
    );

    return {
      payment: this.serializePayment(result.payment),
      folio: this.serializeFolioBilling(result.folio),
    };
  }

  private async listPayments(query: GetPaymentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, payments] = await this.paymentsRepository.listPayments({
      skip: (page - 1) * limit,
      take: limit,
      search: search ?? undefined,
      status: query.status,
      method: query.method,
      folioId: query.folioId,
      recordedFrom: this.parseOptionalDate(query.recordedFrom),
      recordedTo: this.parseOptionalDate(query.recordedTo),
    });

    return {
      items: payments.map((payment) => this.serializePayment(payment)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async findRequiredPayment(
    paymentId: number,
    client?: Prisma.TransactionClient,
  ) {
    const payment = await this.paymentsRepository.findPayment(
      paymentId,
      client,
    );

    if (!payment) {
      throw new NotFoundException('Payment was not found.');
    }

    return payment;
  }

  private async findRequiredFolio(
    folioId: number,
    client?: Prisma.TransactionClient,
  ) {
    const folio = await this.foliosRepository.findFolio(folioId, client);

    if (!folio) {
      throw new NotFoundException('Folio was not found.');
    }

    return folio;
  }

  private ensureFolioCanAcceptPayment(folio: FolioRecord) {
    if (folio.status !== FolioStatus.OPEN) {
      throw new ConflictException('Only open folios can accept payments.');
    }
  }

  private ensurePaymentAmountCanBeRecorded(
    amount: Prisma.Decimal,
    folio: FolioRecord,
  ) {
    if (amount.lte(0)) {
      throw new BadRequestException('Payment amount must be greater than 0.');
    }

    if (amount.gt(folio.balanceAmount)) {
      throw new BadRequestException(
        'Payment amount cannot exceed the folio balance.',
      );
    }
  }

  private async generatePaymentNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (let attempt = 0; attempt < 5; attempt++) {
      const sequence = `${Date.now().toString().slice(-6)}${attempt}`.slice(-6);
      const paymentNumber = `PAY-${datePart}-${sequence}`;
      const existingPayment =
        await this.paymentsRepository.findByPaymentNumber(paymentNumber);

      if (!existingPayment) {
        return paymentNumber;
      }
    }

    throw new ConflictException('Could not generate a unique payment number.');
  }

  private async generateReceiptNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (let attempt = 0; attempt < 5; attempt++) {
      const sequence = `${Date.now().toString().slice(-6)}${attempt}`.slice(-6);
      const receiptNumber = `RCT-${datePart}-${sequence}`;
      const existingReceipt =
        await this.receiptsRepository.findByReceiptNumber(receiptNumber);

      if (!existingReceipt) {
        return receiptNumber;
      }
    }

    throw new ConflictException('Could not generate a unique receipt number.');
  }

  private serializePayment(payment: PaymentRecord) {
    return {
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      folioId: payment.folioId,
      amount: this.serializeDecimal(payment.amount),
      method: payment.method,
      status: payment.status,
      reference: payment.reference,
      notes: payment.notes,
      recordedByUserId: payment.recordedByUserId,
      recordedAt: payment.recordedAt,
      voidedAt: payment.voidedAt,
      voidReason: payment.voidReason,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      folio: this.serializeFolioBilling(payment.folio),
      recordedBy: payment.recordedBy,
    };
  }

  private serializeReceipt(receipt: ReceiptRecord) {
    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      folioId: receipt.folioId,
      paymentId: receipt.paymentId,
      status: receipt.status,
      amount: this.serializeDecimal(receipt.amount),
      issuedByUserId: receipt.issuedByUserId,
      issuedAt: receipt.issuedAt,
      voidedAt: receipt.voidedAt,
      voidReason: receipt.voidReason,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
      folio: this.serializeFolioBilling(receipt.folio),
      payment: receipt.payment
        ? {
            ...receipt.payment,
            amount: this.serializeDecimal(receipt.payment.amount),
          }
        : null,
      issuedBy: receipt.issuedBy,
    };
  }

  private serializeFolioBilling(folio: {
    id: number;
    folioNumber: string;
    stayId: number;
    guestId: number;
    status: FolioStatus;
    totalAmount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    balanceAmount: Prisma.Decimal;
  }) {
    return {
      id: folio.id,
      folioNumber: folio.folioNumber,
      stayId: folio.stayId,
      guestId: folio.guestId,
      status: folio.status,
      totalAmount: this.serializeDecimal(folio.totalAmount),
      paidAmount: this.serializeDecimal(folio.paidAmount),
      balanceAmount: this.serializeDecimal(folio.balanceAmount),
    };
  }

  private recordPaymentAudit(
    currentUser: CurrentUserPayload,
    action: string,
    payment: PaymentRecord,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'Payment',
      entityId: String(payment.id),
      metadata,
    });
  }

  private recordReceiptAudit(
    currentUser: CurrentUserPayload,
    action: string,
    receipt: ReceiptRecord,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'Receipt',
      entityId: String(receipt.id),
      metadata,
    });
  }

  private parseDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid payment date.');
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
