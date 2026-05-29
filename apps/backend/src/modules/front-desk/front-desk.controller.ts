import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import {
  FrontDeskArrivalsQueryDto,
  FrontDeskDashboardQueryDto,
  FrontDeskDeparturesQueryDto,
  FrontDeskInHouseQueryDto,
} from './dto/front-desk-query.dto';
import { FrontDeskService } from './front-desk.service';

@ApiTags('Front Desk')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('front-desk')
export class FrontDeskController {
  constructor(private readonly frontDeskService: FrontDeskService) {}

  @Get('dashboard')
  @Permissions('reservations.read')
  @ApiOperation({ summary: 'Get front desk operational dashboard counts' })
  @ApiOkResponse({ description: 'Front desk dashboard returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  getDashboard(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: FrontDeskDashboardQueryDto,
  ) {
    return this.frontDeskService.getDashboard(currentUser, query);
  }

  @Get('arrivals')
  @Permissions('arrivals.read')
  @ApiOperation({ summary: 'List front desk arrivals for a date' })
  @ApiOkResponse({ description: 'Front desk arrivals returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listArrivals(
    @CurrentUser() currentUser: CurrentUserPayload,
