import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { CreateFloorDto } from './dto/create-floor.dto';
import { GetFloorsQueryDto } from './dto/get-floors-query.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { FloorsService } from './floors.service';

@ApiTags('Floors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('floors')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Post()
  @Permissions('floors.create')
  @ApiOperation({ summary: 'Create a floor' })
  @ApiCreatedResponse({ description: 'Floor created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid floor payload.' })
  @ApiConflictResponse({ description: 'Floor name already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  create(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createFloorDto: CreateFloorDto,
  ) {
    return this.floorsService.create(currentUser, createFloorDto);
  }

  @Get()
  @Permissions('floors.read')
  @ApiOperation({ summary: 'List floors' })
  @ApiOkResponse({ description: 'Floors returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: GetFloorsQueryDto,
  ) {
    return this.floorsService.list(currentUser, query);
  }

  @Get(':id')
  @Permissions('floors.read')
  @ApiOperation({ summary: 'Get one floor' })
  @ApiOkResponse({ description: 'Floor returned successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Floor was not found.' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) floorId: number,
  ) {
    return this.floorsService.getById(currentUser, floorId);
  }

  @Patch(':id')
  @Permissions('floors.update')
  @ApiOperation({ summary: 'Update one floor' })
  @ApiOkResponse({ description: 'Floor updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid floor payload.' })
  @ApiConflictResponse({ description: 'Floor name already exists.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Floor was not found.' })
  update(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) floorId: number,
    @Body() updateFloorDto: UpdateFloorDto,
  ) {
    return this.floorsService.update(currentUser, floorId, updateFloorDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions('floors.delete')
  @ApiOperation({ summary: 'Deactivate one floor' })
  @ApiOkResponse({ description: 'Floor deactivated successfully.' })
  @ApiBadRequestResponse({
    description: 'Floor has active rooms and cannot be deactivated.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiForbiddenResponse({ description: 'Missing required permission.' })
  @ApiNotFoundResponse({ description: 'Floor was not found.' })
  remove(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) floorId: number,
  ) {
    return this.floorsService.remove(currentUser, floorId);
  }
}
