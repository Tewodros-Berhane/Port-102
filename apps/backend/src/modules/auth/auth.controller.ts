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
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the current user, role, department, and permissions',
  })
  me(@CurrentUser() currentUser: CurrentUserPayload) {
    return this.authService.getMe(currentUser);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all refresh tokens for the current user' })
  logoutAll(@CurrentUser() currentUser: CurrentUserPayload) {
    return this.authService.logoutAll(currentUser);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the current user password' })
  changePassword(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(currentUser, changePasswordDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Request a password reset token' })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Reset a password using a reset token' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
