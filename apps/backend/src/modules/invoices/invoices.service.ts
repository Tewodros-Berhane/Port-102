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
  ) {}
}
