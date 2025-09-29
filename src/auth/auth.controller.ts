import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthPayloadDto } from './dto/auth.dto';
import { AuthService } from './auth.service';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    async login(@Body() authPayload: AuthPayloadDto, @Res({ passthrough: true }) res: Response) {
        
        const { accessToken } = await this.authService.validateUser(authPayload);

        res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 3600000,
    });

    return { message: 'Login successful' };
    }
}
