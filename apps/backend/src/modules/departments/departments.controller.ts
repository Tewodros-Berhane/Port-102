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
import { CreateDepartmentDto } from './dto/create-department.dto';
import { GetDepartmentsQueryDto } from './dto/get-departments-query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsService } from './departments.service';

@ApiTags('Departments')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required.' })
@ApiForbiddenResponse({ description: 'Missing required permission.' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Post()
  @Permissions('departments.create')
  @ApiOperation({ summary: 'Create a department' })
  @ApiCreatedResponse({ description: 'Department created successfully.' })
  @ApiConflictResponse({ description: 'Department key already exists.' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.service.create(user, dto);
  }

  @Get()
  @Permissions('departments.read')
  @ApiOperation({ summary: 'List departments' })
  @ApiOkResponse({ description: 'Paginated departments returned.' })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetDepartmentsQueryDto,
  ) {
    return this.service.list(user, query);
  }

  @Get(':id')
  @Permissions('departments.read')
  @ApiOperation({ summary: 'Get one department' })
  @ApiNotFoundResponse({ description: 'Department was not found.' })
  getById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.getById(user, id);
  }

  @Patch(':id')
  @Permissions('departments.update')
  @ApiOperation({ summary: 'Update one department' })
  @ApiConflictResponse({ description: 'Department key already exists.' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions('departments.delete')
  @ApiOperation({ summary: 'Deactivate one department' })
  @ApiOkResponse({ description: 'Department deactivated.' })
  @ApiBadRequestResponse({
    description: 'Active users or employees are still assigned.',
  })
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(user, id);
  }
}
