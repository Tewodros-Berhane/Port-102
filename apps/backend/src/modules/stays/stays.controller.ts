import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
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
import { GetStaysQueryDto } from './dto/get-stays-query.dto';
import { StaysService } from './stays.service';

@ApiTags('Stays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stays')
export class StaysController {
  constructor(private readonly staysService: StaysService) {}

  @Get('active/list')
  @Permissions('reservations.read')
  @ApiOperation({ summary: 'List active stays' })
  @ApiOkResponse({ description: 'Active stays returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listActive(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetStaysQueryDto,
  ) {
    return this.staysService.listActive(currentUser, query);
  }

  @Get('in-house/guests')
  @Permissions('in_house_guests.read')
  @ApiOperation({ summary: 'List in-house guests' })
  @ApiOkResponse({ description: 'In-house guests returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  listInHouseGuests(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetStaysQueryDto,
  ) {
    return this.staysService.listInHouseGuests(currentUser, query);
  }

  @Get()
  @Permissions('reservations.read')
  @ApiOperation({ summary: 'List stays' })
  @ApiOkResponse({ description: 'Stays returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetStaysQueryDto,
  ) {
    return this.staysService.list(currentUser, query);
  }

  @Get(':id')
  @Permissions('reservations.read')
  @ApiOperation({ summary: 'Get one stay' })
  @ApiOkResponse({ description: 'Stay returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Stay was not found.' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) stayId: number,
  ) {
    return this.staysService.getById(currentUser, stayId);
  }
}
