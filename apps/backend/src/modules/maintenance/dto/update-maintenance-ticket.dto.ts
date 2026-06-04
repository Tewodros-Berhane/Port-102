import { PartialType } from '@nestjs/swagger';

import { CreateMaintenanceTicketDto } from './create-maintenance-ticket.dto';

export class UpdateMaintenanceTicketDto extends PartialType(
  CreateMaintenanceTicketDto,
) {}
