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
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { LinkEmployeeUserDto } from './dto/link-employee-user.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HotelAccessGuard, PermissionsGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Permissions('employees.create')
  @ApiOperation({ summary: 'Create a hotel-scoped employee profile' })
  create(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createEmployeeDto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(currentUser, createEmployeeDto);
  }

  @Get()
  @Permissions('employees.read')
  @ApiOperation({ summary: 'List hotel-scoped employee profiles' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: ListEmployeesQueryDto,
  ) {
    return this.employeesService.list(currentUser, query);
  }

  @Get(':id')
  @Permissions('employees.read')
  @ApiOperation({ summary: 'Get one hotel-scoped employee profile' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) employeeId: number,
  ) {
    return this.employeesService.getById(currentUser, employeeId);
  }

  @Patch(':id')
  @Permissions('employees.update')
  @ApiOperation({ summary: 'Update one hotel-scoped employee profile' })
  update(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) employeeId: number,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(
      currentUser,
      employeeId,
      updateEmployeeDto,
    );
  }

  @Patch(':id/deactivate')
  @Permissions('employees.deactivate')
  @ApiOperation({ summary: 'Deactivate a hotel-scoped employee profile' })
  deactivate(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) employeeId: number,
  ) {
    return this.employeesService.deactivate(currentUser, employeeId);
  }

  @Post(':id/link-user')
  @HttpCode(HttpStatus.OK)
  @Permissions('employees.update', 'users.assign_role')
  @ApiOperation({ summary: 'Link an employee profile to a hotel login user' })
  linkUser(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) employeeId: number,
    @Body() linkEmployeeUserDto: LinkEmployeeUserDto,
  ) {
    return this.employeesService.linkUser(
      currentUser,
      employeeId,
      linkEmployeeUserDto,
    );
  }
}
