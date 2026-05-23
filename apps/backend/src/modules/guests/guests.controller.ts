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
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { CreateGuestDto } from './dto/create-guest.dto';
import { ListGuestsQueryDto } from './dto/list-guests-query.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { GuestsService } from './guests.service';

@ApiTags('Guests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post()
  @Permissions('guests.create')
  @ApiOperation({ summary: 'Create a guest profile' })
  create(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createGuestDto: CreateGuestDto,
  ) {
    return this.guestsService.create(currentUser, createGuestDto);
  }

  @Get()
  @Permissions('guests.read')
  @ApiOperation({ summary: 'List guest profiles' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: ListGuestsQueryDto,
  ) {
    return this.guestsService.list(currentUser, query);
  }

  @Get(':id')
  @Permissions('guests.read')
  @ApiOperation({ summary: 'Get one guest profile' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) guestId: number,
  ) {
    return this.guestsService.getById(currentUser, guestId);
  }

  @Patch(':id')
  @Permissions('guests.update', 'guests.preferences.update')
  @ApiOperation({ summary: 'Update one guest profile' })
  update(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) guestId: number,
    @Body() updateGuestDto: UpdateGuestDto,
  ) {
    return this.guestsService.update(currentUser, guestId, updateGuestDto);
  }
}
