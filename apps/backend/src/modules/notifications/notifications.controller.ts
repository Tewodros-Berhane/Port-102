import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { NotificationQueryDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';
@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('notifications.read')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}
  @Get()
  @ApiOperation({ summary: 'List the current user notification inbox' })
  @ApiOkResponse({
    description: 'Paginated owned notifications; archives excluded by default.',
  })
  list(@CurrentUser() u: CurrentUserPayload, @Query() q: NotificationQueryDto) {
    return this.service.list(u.sub, q);
  }
  @Get('unread-count')
  @ApiOperation({ summary: 'Count unread notifications' })
  @ApiOkResponse({ description: 'Current user unread count.' })
  count(@CurrentUser() u: CurrentUserPayload) {
    return this.service.unreadCount(u.sub);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get an owned notification' })
  @ApiOkResponse({ description: 'Owned notification.' })
  get(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.get(u.sub, id);
  }
  @Patch(':id/read')
  @ApiOperation({ summary: 'Idempotently mark a notification read' })
  @ApiOkResponse({ description: 'Read notification.' })
  read(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.markRead(u.sub, id);
  }
  @Patch('read-all')
  @ApiOperation({ summary: 'Idempotently mark all notifications read' })
  @ApiOkResponse({ description: 'Updated count.' })
  readAll(@CurrentUser() u: CurrentUserPayload) {
    return this.service.readAll(u.sub);
  }
  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive an owned notification' })
  @ApiOkResponse({ description: 'Archived notification.' })
  archive(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.archive(u.sub, id);
  }
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an owned notification' })
  @ApiOkResponse({ description: 'Deletion confirmation.' })
  remove(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(u.sub, id);
  }
}
