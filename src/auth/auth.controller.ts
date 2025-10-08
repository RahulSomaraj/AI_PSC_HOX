import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthPayloadDto } from './dto/auth.dto';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt.auth.guard';
import { Public } from 'src/common/decorators/public.decorator';



@Controller('auth')
export class AuthController {
    jwtService: any;
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @Public()
    async login(@Body() authPayload: AuthPayloadDto, @Res({ passthrough: true }) res: Response) {
        
        const { accessToken } = await this.authService.validateUser(authPayload);

    res.setHeader('Authorization', `Bearer ${accessToken}`);

    return { message: 'Login successful',accessToken };
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    async logout(@Req() req)
    {
        await this.authService.logout(req);
        return { message: 'Logged out successfully' };
    }
    
    

}
