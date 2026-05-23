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
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Permissions('employees.create')
  @ApiOperation({ summary: 'Create an employee profile' })
  create(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() createEmployeeDto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(currentUser, createEmployeeDto);
  }

  @Get()
  @Permissions('employees.read')
  @ApiOperation({ summary: 'List employee profiles' })
  list(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Query() query: ListEmployeesQueryDto,
  ) {
    return this.employeesService.list(currentUser, query);
  }

  @Get(':id')
  @Permissions('employees.read')
  @ApiOperation({ summary: 'Get one employee profile' })
  getById(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) employeeId: number,
  ) {
    return this.employeesService.getById(currentUser, employeeId);
  }

  @Patch(':id')
  @Permissions('employees.update')
  @ApiOperation({ summary: 'Update one employee profile' })
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
  @ApiOperation({ summary: 'Deactivate an employee profile' })
  deactivate(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) employeeId: number,
  ) {
    return this.employeesService.deactivate(currentUser, employeeId);
  }

  @Post(':id/link-user')
  @HttpCode(HttpStatus.OK)
  @Permissions('employees.update', 'users.assign_role')
  @ApiOperation({ summary: 'Link an employee profile to a login user' })
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
