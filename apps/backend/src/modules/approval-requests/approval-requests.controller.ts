import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { HotelAccessGuard } from '../../common/guards/hotel-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { ApprovalRequestsService } from './approval-requests.service';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';
import { DecideApprovalRequestDto } from './dto/decide-approval-request.dto';
import { ListApprovalRequestsQueryDto } from './dto/list-approval-requests-query.dto';

@ApiTags('Approval Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HotelAccessGuard, PermissionsGuard)
@Controller('approval-requests')
export class ApprovalRequestsController {
  constructor(
    private readonly approvalRequestsService: ApprovalRequestsService,
  ) {}

  @Post()
  @Permissions('approval_requests.create')
  @ApiOperation({ summary: 'Create a hotel-scoped approval request' })
  create(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createApprovalRequestDto: CreateApprovalRequestDto,
  ) {
    return this.approvalRequestsService.create(
      currentUser,
      createApprovalRequestDto,
    );
  }

  @Get()
  @Permissions('approval_requests.read')
  @ApiOperation({ summary: 'List hotel-scoped approval requests' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: ListApprovalRequestsQueryDto,
  ) {
    return this.approvalRequestsService.list(currentUser, query);
  }

  @Get(':id')
  @Permissions('approval_requests.read')
  @ApiOperation({ summary: 'Get one hotel-scoped approval request' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) approvalRequestId: number,
  ) {
    return this.approvalRequestsService.getById(currentUser, approvalRequestId);
  }

  @Patch(':id/approve')
  @Permissions('approval_requests.approve')
  @ApiOperation({ summary: 'Approve a pending approval request' })
  approve(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) approvalRequestId: number,
    @Body() decideApprovalRequestDto: DecideApprovalRequestDto,
  ) {
    return this.approvalRequestsService.approve(
      currentUser,
      approvalRequestId,
      decideApprovalRequestDto,
    );
  }

  @Patch(':id/reject')
  @Permissions('approval_requests.reject')
  @ApiOperation({ summary: 'Reject a pending approval request' })
  reject(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) approvalRequestId: number,
    @Body() decideApprovalRequestDto: DecideApprovalRequestDto,
  ) {
    return this.approvalRequestsService.reject(
      currentUser,
      approvalRequestId,
      decideApprovalRequestDto,
    );
  }
}
