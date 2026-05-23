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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AssignRolePermissionsDto } from './dto/assign-role-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('roles.read')
  @ApiOperation({ summary: 'List roles' })
  list(@CurrentUser() currentUser: CurrentUserPayload) {
    return this.rolesService.list(currentUser);
  }

  @Get(':id')
  @Permissions('roles.read')
  @ApiOperation({ summary: 'Get one visible role' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) roleId: number,
  ) {
    return this.rolesService.getById(currentUser, roleId);
  }

  @Post()
  @Permissions('roles.create')
  @ApiOperation({ summary: 'Create a custom role' })
  create(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createRoleDto: CreateRoleDto,
  ) {
    return this.rolesService.create(currentUser, createRoleDto);
  }

  @Patch(':id')
  @Permissions('roles.update')
  @ApiOperation({ summary: 'Update a visible role' })
  update(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) roleId: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.rolesService.update(currentUser, roleId, updateRoleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions('roles.delete')
  @ApiOperation({ summary: 'Delete a custom role' })
  remove(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) roleId: number,
  ) {
    return this.rolesService.remove(currentUser, roleId);
  }

  @Post(':id/permissions')
  @HttpCode(HttpStatus.OK)
  @Permissions('permissions.assign')
  @ApiOperation({ summary: 'Replace permissions assigned to a role' })
  assignPermissions(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) roleId: number,
    @Body() assignRolePermissionsDto: AssignRolePermissionsDto,
  ) {
    return this.rolesService.assignPermissions(
      currentUser,
      roleId,
      assignRolePermissionsDto,
    );
  }
}
