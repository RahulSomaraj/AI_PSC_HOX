import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  AuthPayloadDto,
  RefreshTokenDto,
  LogoutDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdatePasswordDto,
  DeleteProfileDto,
} from './dto/auth.dto';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt.auth.guard';
import { Public } from '../common/decorators/public.decorator';
import express from 'express';
import { HttpExceptionFilter } from '../shared/exception-service';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('auth')
@UseFilters(new HttpExceptionFilter('AuthController'))
@Controller('auth')
export class AuthController {
  jwtService: any;
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: AuthPayloadDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Login successful' },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        sessionId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() authPayload: AuthPayloadDto,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, sessionId } =
      await this.authService.validateUser(authPayload, req);

    res.setHeader('Authorization', `Bearer ${accessToken}`);

    return {
      message: 'Login successful',
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout from all sessions' })
  @ApiResponse({
    status: 200,
    description: 'Logged out from all sessions successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(@Req() req) {
    await this.authService.logoutAll(req);
    return { message: 'Logged out from all sessions successfully' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout from current session' })
  @ApiBody({ type: LogoutDto })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Req() req, @Body() body: LogoutDto) {
    await this.authService.logout(req, body);
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Token refreshed' },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        sessionId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body() refreshPayload: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, sessionId } =
      await this.authService.refreshTokens(refreshPayload);

    res.setHeader('Authorization', `Bearer ${accessToken}`);
    return {
      message: 'Token refreshed',
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  @Post('forgot-password')
  @Public()
  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Public()
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(resetPasswordDto);
  }

  @Post('update-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update password' })
  @ApiBody({ type: UpdatePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async updatePassword(
    @GetUser('id') userId: number,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return await this.authService.updatePassword(userId, updatePasswordDto);
  }

  @Delete('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete user profile' })
  @ApiBody({ type: DeleteProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Profile deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid password' })
  async deleteProfile(
    @GetUser('id') userId: number,
    @Body() deleteProfileDto: DeleteProfileDto,
  ) {
    return await this.authService.deleteProfile(userId, deleteProfileDto);
  }
}
