import {
  Body,
  Controller,
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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { HotelAccessGuard } from '../../common/guards/hotel-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HotelAccessGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions('users.create')
  @ApiOperation({ summary: 'Create a hotel-scoped login user' })
  create(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.create(currentUser, createUserDto);
  }

  @Get()
  @Permissions('users.read')
  @ApiOperation({ summary: 'List hotel-scoped users' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.usersService.list(currentUser, query);
  }

  @Get(':id')
  @Permissions('users.read')
  @ApiOperation({ summary: 'Get one hotel-scoped user' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) userId: number,
  ) {
    return this.usersService.getById(currentUser, userId);
  }

  @Patch(':id')
  @Permissions('users.update')
  @ApiOperation({ summary: 'Update one hotel-scoped user' })
  update(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(currentUser, userId, updateUserDto);
  }

  @Patch(':id/deactivate')
  @Permissions('users.deactivate')
  @ApiOperation({
    summary: 'Deactivate a user membership in the current hotel',
  })
  deactivate(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) userId: number,
  ) {
    return this.usersService.deactivate(currentUser, userId);
  }

  @Patch(':id/activate')
  @Permissions('users.activate')
  @ApiOperation({ summary: 'Activate a user membership in the current hotel' })
  activate(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) userId: number,
  ) {
    return this.usersService.activate(currentUser, userId);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @Permissions('users.reset_password')
  @ApiOperation({ summary: 'Reset a hotel user password' })
  resetPassword(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) userId: number,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(
      currentUser,
      userId,
      resetPasswordDto,
    );
  }

  @Post(':id/assign-role')
  @HttpCode(HttpStatus.OK)
  @Permissions('users.assign_role', 'roles.assign')
  @ApiOperation({ summary: 'Assign a role to a user in the current hotel' })
  assignRole(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) userId: number,
    @Body() assignRoleDto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(currentUser, userId, assignRoleDto);
  }
}
