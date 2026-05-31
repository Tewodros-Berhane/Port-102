import { Injectable } from '@nestjs/common';
import { InvoicesRepository } from './repositories/invoices.repository';
import { ReceiptsRepository } from './repositories/receipts.repository';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly receiptsRepository: ReceiptsRepository,
  ) {}
}
