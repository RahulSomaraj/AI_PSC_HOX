import { Body, Controller, Post, Req, Res, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthPayloadDto, RefreshTokenDto, LogoutDto } from './dto/auth.dto';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt.auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import express from 'express';
import { HttpExceptionFilter } from 'src/shared/exception-service';

@UseFilters(new HttpExceptionFilter('AuthController'))
@Controller('auth')
export class AuthController {
    jwtService: any;
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @Public()
    async login(@Body() authPayload: AuthPayloadDto,@Req() req: express.Request,@Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, sessionId } = await this.authService.validateUser(authPayload, req);

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
    async logoutAll(@Req() req)
    {
        await this.authService.logoutAll(req);
        return { message: 'Logged out from all sessions successfully' };
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    async logout(@Req() req, @Body() body: LogoutDto)
    {
        await this.authService.logout(req, body);
        return { message: 'Logged out successfully' };
    }


    @Post('refresh')
    @Public()
    async refresh(
    @Body() refreshPayload: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response
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
    
    

}