import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  FolioStatus,
  InvoiceStatus,
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
import { PaymentsRepository } from '../payments/repositories/payments.repository';
import type { PaymentRecord } from '../payments/repositories/payments.repository';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { GenerateReceiptDto } from './dto/generate-receipt.dto';
import { GetInvoicesQueryDto } from './dto/get-invoices-query.dto';
import { GetReceiptsQueryDto } from './dto/get-receipts-query.dto';
import { VoidInvoiceDto } from './dto/void-invoice.dto';
import { VoidReceiptDto } from './dto/void-receipt.dto';
import {
  InvoiceRecord,
  InvoicesRepository,
} from './repositories/invoices.repository';
import {
  ReceiptRecord,
  ReceiptsRepository,
} from './repositories/receipts.repository';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly receiptsRepository: ReceiptsRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly foliosRepository: FoliosRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async generate(
    currentUser: CurrentUserPayload,
    generateInvoiceDto: GenerateInvoiceDto,
  ) {
    const invoiceNumber = await this.generateInvoiceNumber();
    const invoice = await this.invoicesRepository.runInTransaction(
      async (client) => {
        const folio = await this.findRequiredFolio(
          generateInvoiceDto.folioId,
          client,
        );
        this.ensureFolioCanBeInvoiced(folio);

        const existingInvoice =
          await this.invoicesRepository.findIssuedInvoiceByFolioId(
            folio.id,
            client,
          );

        if (existingInvoice) {
          throw new ConflictException(
            'Folio already has an active issued invoice.',
          );
        }

        return this.invoicesRepository.createInvoice(
          {
            invoiceNumber,
            folioId: folio.id,
            status: InvoiceStatus.ISSUED,
            subtotalAmount: folio.subtotalAmount.toFixed(2),
            discountAmount: folio.discountAmount.toFixed(2),
            taxAmount: folio.taxAmount.toFixed(2),
            serviceAmount: folio.serviceAmount.toFixed(2),
            totalAmount: folio.totalAmount.toFixed(2),
            issuedByUserId: currentUser.sub,
          },
          client,
        );
      },
    );

    await this.recordInvoiceAudit(currentUser, 'invoices.generated', invoice, {
      invoiceNumber: invoice.invoiceNumber,
      folioId: invoice.folioId,
      subtotalAmount: this.serializeDecimal(invoice.subtotalAmount),
      discountAmount: this.serializeDecimal(invoice.discountAmount),
      taxAmount: this.serializeDecimal(invoice.taxAmount),
      serviceAmount: this.serializeDecimal(invoice.serviceAmount),
      totalAmount: this.serializeDecimal(invoice.totalAmount),
    });

    return this.serializeInvoice(invoice);
  }

  async list(_currentUser: CurrentUserPayload, query: GetInvoicesQueryDto) {
    return this.listInvoices(query);
  }

  async listByFolio(
    _currentUser: CurrentUserPayload,
    folioId: number,
    query: GetInvoicesQueryDto,
  ) {
    await this.findRequiredFolio(folioId);

    return this.listInvoices({
      ...query,
      folioId,
    });
  }

  async getById(_currentUser: CurrentUserPayload, invoiceId: number) {
    const invoice = await this.findRequiredInvoice(invoiceId);

    return this.serializeInvoice(invoice);
  }

  async void(
    currentUser: CurrentUserPayload,
    invoiceId: number,
    voidInvoiceDto: VoidInvoiceDto,
  ) {
    const voidReason = this.normalizeRequiredString(
      voidInvoiceDto.voidReason,
      'Invoice void reason is required.',
    );
    const invoice = await this.findRequiredInvoice(invoiceId);

    if (invoice.status !== InvoiceStatus.ISSUED) {
      throw new ConflictException('Only issued invoices can be voided.');
    }

    const voidedInvoice = await this.invoicesRepository.updateInvoice(
      invoice.id,
      {
        status: InvoiceStatus.VOIDED,
        voidedAt: new Date(),
        voidReason,
      },
    );

    await this.recordInvoiceAudit(
      currentUser,
      'invoices.voided',
      voidedInvoice,
      {
        invoiceNumber: invoice.invoiceNumber,
        folioId: invoice.folioId,
        totalAmount: this.serializeDecimal(invoice.totalAmount),
        voidReason,
      },
    );

    return this.serializeInvoice(voidedInvoice);
  }

  async generateReceipt(
    currentUser: CurrentUserPayload,
    generateReceiptDto: GenerateReceiptDto,
  ) {
    const receiptNumber = await this.generateReceiptNumber();
    const receipt = await this.invoicesRepository.runInTransaction(
      async (client) => {
        const folio = await this.findRequiredFolio(
          generateReceiptDto.folioId,
          client,
        );
        const payment = generateReceiptDto.paymentId
          ? await this.findRequiredPayment(generateReceiptDto.paymentId, client)
          : null;
        const amount = this.resolveReceiptAmount(generateReceiptDto, payment);

        if (payment) {
          this.ensurePaymentCanBeReceipted(payment, folio.id);
        }

        return this.receiptsRepository.createReceipt(
          {
            receiptNumber,
            folioId: folio.id,
            paymentId: payment?.id ?? null,
            status: ReceiptStatus.ISSUED,
            amount: amount.toFixed(2),
            issuedByUserId: currentUser.sub,
          },
          client,
        );
      },
    );

    await this.recordReceiptAudit(currentUser, 'receipts.generated', receipt, {
      receiptNumber: receipt.receiptNumber,
      folioId: receipt.folioId,
      paymentId: receipt.paymentId,
      amount: this.serializeDecimal(receipt.amount),
    });

    return this.serializeReceipt(receipt);
  }

  async listReceipts(
    _currentUser: CurrentUserPayload,
    query: GetReceiptsQueryDto,
  ) {
    return this.listReceiptRecords(query);
  }

  async listReceiptsByFolio(
    _currentUser: CurrentUserPayload,
    folioId: number,
    query: GetReceiptsQueryDto,
  ) {
    await this.findRequiredFolio(folioId);

    return this.listReceiptRecords({
      ...query,
      folioId,
    });
  }

  async getReceiptById(_currentUser: CurrentUserPayload, receiptId: number) {
    const receipt = await this.findRequiredReceipt(receiptId);

    return this.serializeReceipt(receipt);
  }

  async voidReceipt(
    currentUser: CurrentUserPayload,
    receiptId: number,
    voidReceiptDto: VoidReceiptDto,
  ) {
    const voidReason = this.normalizeRequiredString(
      voidReceiptDto.voidReason,
      'Receipt void reason is required.',
    );
    const receipt = await this.findRequiredReceipt(receiptId);

    if (receipt.status !== ReceiptStatus.ISSUED) {
      throw new ConflictException('Only issued receipts can be voided.');
    }

    const voidedReceipt = await this.receiptsRepository.updateReceipt(
      receipt.id,
      {
        status: ReceiptStatus.VOIDED,
        voidedAt: new Date(),
        voidReason,
      },
    );

    await this.recordReceiptAudit(
      currentUser,
      'receipts.voided',
      voidedReceipt,
      {
        receiptNumber: receipt.receiptNumber,
        folioId: receipt.folioId,
        paymentId: receipt.paymentId,
        amount: this.serializeDecimal(receipt.amount),
        voidReason,
      },
    );

    return this.serializeReceipt(voidedReceipt);
  }

  private async listInvoices(query: GetInvoicesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, invoices] = await this.invoicesRepository.listInvoices({
      skip: (page - 1) * limit,
      take: limit,
      search: search ?? undefined,
      status: query.status,
      folioId: query.folioId,
      issuedFrom: this.parseOptionalDate(query.issuedFrom),
      issuedTo: this.parseOptionalDate(query.issuedTo),
    });

    return {
      items: invoices.map((invoice) => this.serializeInvoice(invoice)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async listReceiptRecords(query: GetReceiptsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = this.normalizeOptionalString(query.search);
    const [total, receipts] = await this.receiptsRepository.listReceipts({
      skip: (page - 1) * limit,
      take: limit,
      search: search ?? undefined,
      status: query.status,
      folioId: query.folioId,
      paymentId: query.paymentId,
      issuedFrom: this.parseOptionalDate(query.issuedFrom),
      issuedTo: this.parseOptionalDate(query.issuedTo),
    });

    return {
      items: receipts.map((receipt) => this.serializeReceipt(receipt)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async findRequiredInvoice(
    invoiceId: number,
    client?: Prisma.TransactionClient,
  ) {
    const invoice = await this.invoicesRepository.findInvoice(
      invoiceId,
      client,
    );

    if (!invoice) {
      throw new NotFoundException('Invoice was not found.');
    }

    return invoice;
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

  private async findRequiredReceipt(
    receiptId: number,
    client?: Prisma.TransactionClient,
  ) {
    const receipt = await this.receiptsRepository.findReceipt(
      receiptId,
      client,
    );

    if (!receipt) {
      throw new NotFoundException('Receipt was not found.');
    }

    return receipt;
  }

  private ensureFolioCanBeInvoiced(folio: FolioRecord) {
    if (folio.status === FolioStatus.VOIDED) {
      throw new ConflictException('Voided folios cannot be invoiced.');
    }
  }

  private ensurePaymentCanBeReceipted(payment: PaymentRecord, folioId: number) {
    if (payment.folioId !== folioId) {
      throw new BadRequestException(
        'Receipt payment must belong to the selected folio.',
      );
    }

    if (payment.status !== PaymentStatus.RECORDED) {
      throw new ConflictException('Only recorded payments can be receipted.');
    }
  }

  private resolveReceiptAmount(
    generateReceiptDto: GenerateReceiptDto,
    payment: PaymentRecord | null,
  ) {
    if (payment) {
      if (
        generateReceiptDto.amount !== undefined &&
        generateReceiptDto.amount !== null
      ) {
        const requestedAmount = new Prisma.Decimal(generateReceiptDto.amount);

        if (!requestedAmount.equals(payment.amount)) {
          throw new BadRequestException(
            'Receipt amount must match the linked payment amount.',
          );
        }
      }

      return payment.amount;
    }

    if (
      generateReceiptDto.amount === undefined ||
      generateReceiptDto.amount === null
    ) {
      throw new BadRequestException(
        'Receipt amount is required when no payment is linked.',
      );
    }

    return new Prisma.Decimal(generateReceiptDto.amount);
  }

  private async generateInvoiceNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (let attempt = 0; attempt < 5; attempt++) {
      const sequence = `${Date.now().toString().slice(-6)}${attempt}`.slice(-6);
      const invoiceNumber = `INV-${datePart}-${sequence}`;
      const existingInvoice =
        await this.invoicesRepository.findByInvoiceNumber(invoiceNumber);

      if (!existingInvoice) {
        return invoiceNumber;
      }
    }

    throw new ConflictException('Could not generate a unique invoice number.');
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

  private serializeInvoice(invoice: InvoiceRecord) {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      folioId: invoice.folioId,
      status: invoice.status,
      subtotalAmount: this.serializeDecimal(invoice.subtotalAmount),
      discountAmount: this.serializeDecimal(invoice.discountAmount),
      taxAmount: this.serializeDecimal(invoice.taxAmount),
      serviceAmount: this.serializeDecimal(invoice.serviceAmount),
      totalAmount: this.serializeDecimal(invoice.totalAmount),
      issuedByUserId: invoice.issuedByUserId,
      issuedAt: invoice.issuedAt,
      voidedAt: invoice.voidedAt,
      voidReason: invoice.voidReason,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      folio: this.serializeFolioBilling(invoice.folio),
      issuedBy: invoice.issuedBy,
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

  private recordInvoiceAudit(
    currentUser: CurrentUserPayload,
    action: string,
    invoice: InvoiceRecord,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.auditLogsService.record({
      actorUserId: currentUser.sub,
      action,
      entityType: 'Invoice',
      entityId: String(invoice.id),
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
      throw new BadRequestException('Invalid invoice date.');
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
