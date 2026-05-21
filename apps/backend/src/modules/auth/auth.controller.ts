import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HotelAccessGuard } from '../../common/guards/hotel-access.guard';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SelectHotelDto } from './dto/select-hotel.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import type { CurrentUserPayload } from './types/current-user-payload.type';
import type { LocalAuthRequest } from './types/local-authenticated-user.type';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Validate email and password credentials' })
  @ApiBody({ type: LoginDto })
  login(@Request() request: LocalAuthRequest, @Body() _loginDto: LoginDto) {
    return this.authService.buildLoginResponse(request.user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({
    summary: 'Rotate refresh token and issue a new access token',
  })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Revoke one refresh token' })
  logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, HotelAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the current user, hotel, role, and permissions',
  })
  me(@CurrentUser() currentUser: CurrentUserPayload) {
    return this.authService.getMe(currentUser);
  }

  @Get('my-hotels')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List hotels available to the current user' })
  myHotels(@CurrentUser() currentUser: CurrentUserPayload) {
    return this.authService.getMyHotels(currentUser);
  }

  @Post('select-hotel')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Select an active hotel after multi-hotel login' })
  @ApiBody({ type: SelectHotelDto })
  selectHotel(@Body() selectHotelDto: SelectHotelDto) {
    return this.authService.selectHotel(
      selectHotelDto.hotelSelectionToken,
      selectHotelDto.hotelId,
    );
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all refresh tokens for the current user' })
  logoutAll(@CurrentUser() currentUser: CurrentUserPayload) {
    return this.authService.logoutAll(currentUser);
  }
}
