import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PermissionsRepository {
  constructor(protected readonly prisma: PrismaService) {}
}
