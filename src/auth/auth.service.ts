import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthPayloadDto } from './dto/auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { RevokedToken } from './entities/revoked-token.entity';
import { ExtractJwt } from 'passport-jwt';
import type { Request } from 'express';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepositories:Repository<User>,private jwtService:JwtService,
        @InjectRepository(RevokedToken)
        private revokedTokenRepo:Repository<RevokedToken>
    ){}

    async validateUser(authPayloadDto:AuthPayloadDto){

        const email = authPayloadDto.email?.trim().toLowerCase();

        const findUser = await this.userRepositories.findOne({
        where: { email },
        select: { id: true, email: true, passwordHash: true, role: true },
        });

    
        if (!findUser) {
        throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid=await argon2.verify(findUser.passwordHash,authPayloadDto.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        
        const payload = { sub: findUser.id, email: findUser.email ,roles: findUser.role};
        const accessToken=this.jwtService.sign(payload);   
        return {accessToken};
    }

    async logout(req: Request) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req as any);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    const decoded = this.jwtService.decode(token) as { sub?: number; exp?: number } | null;
    if (!decoded?.exp || !decoded?.sub) {
        throw new UnauthorizedException('Invalid or malformed token');
    }

    const expiresAt = new Date(decoded.exp * 1000);

    await this.revokedTokenRepo.save({
        token,
        userId: decoded.sub, 
        expiresAt,
    });
    }

}
