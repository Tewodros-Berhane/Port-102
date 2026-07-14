import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { UpdatePropertySettingsDto } from './dto/update-property-settings.dto';
import { PropertySettingsService } from './property-settings.service';
@ApiTags('property-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('property-settings')
export class PropertySettingsController {
  constructor(private readonly service: PropertySettingsService) {}
  @Get()
  @Permissions('hotel.profile.read', 'hotel.settings.read')
  @ApiOperation({ summary: 'Get singleton property settings' })
  @ApiOkResponse({ description: 'Property identity and operational settings.' })
  get() {
    return this.service.get();
  }
  @Patch()
  @Permissions('hotel.profile.update', 'hotel.settings.update')
  @ApiOperation({ summary: 'Update singleton property settings' })
  @ApiOkResponse({ description: 'Updated property settings.' })
  update(
    @Body() dto: UpdatePropertySettingsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.service.update(dto, user);
  }
}
