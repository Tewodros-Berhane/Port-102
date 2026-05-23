import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AuditLogsService } from './audit-logs.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Permissions('audit_logs.read')
  @ApiOperation({ summary: 'List audit logs' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: ListAuditLogsQueryDto,
  ) {
    return this.auditLogsService.list(currentUser, query);
  }

  @Get(':id')
  @Permissions('audit_logs.read')
  @ApiOperation({ summary: 'Get one audit log' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) auditLogId: number,
  ) {
    return this.auditLogsService.getById(currentUser, auditLogId);
  }
}
