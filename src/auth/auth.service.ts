import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthPayloadDto, RefreshTokenDto, LogoutDto } from './dto/auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { RevokedToken } from './entities/revoked-token.entity';
import { ExtractJwt } from 'passport-jwt';
import type { Request } from 'express';
import { UserSession } from './entities/user-session.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepositories:Repository<User>,private jwtService:JwtService,
        @InjectRepository(RevokedToken)
        private revokedTokenRepo:Repository<RevokedToken>,
        @InjectRepository(UserSession)
        private sessionRepo: Repository<UserSession>
    ){}

    async validateUser(authPayloadDto: AuthPayloadDto, req: Request) {
    const email = authPayloadDto.email?.trim().toLowerCase();

    const findUser = await this.userRepositories.findOne({
        where: { email },
        select: { id: true, email: true, passwordHash: true, role: true },
    });

    if (!findUser) {
        throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(findUser.passwordHash, authPayloadDto.password);
    if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
    }

    const sessionId = randomUUID();
    const payload = { sub: findUser.id, email: findUser.email, roles: findUser.role, sessionId };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const session = this.sessionRepo.create({
        id: sessionId,
        user: findUser,
        refreshToken,
        deviceInfo: req.headers['user-agent'],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await this.sessionRepo.save(session);

    return {
        accessToken,
        refreshToken,
        sessionId: session.id,
    };
    }

    async logout(req: Request, logoutDto: LogoutDto) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req as any);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    // Verify token and get payload (contains sub and exp)
    let verified: any;
    try {
        verified = this.jwtService.verify(token);
    } catch (err) {
        throw new UnauthorizedException('Invalid or expired token');
    }

    const userId = verified?.sub;
    const exp = verified?.exp;
    if (!userId || !exp) {
        throw new UnauthorizedException('Invalid token payload');
    }

    const expiresAt = new Date(exp * 1000);

    // 1. Revoke the access token
    await this.revokedTokenRepo.save({
        token,
        userId,
        expiresAt,
    });

    // 2. Revoke the specific session when provided; otherwise best-effort current user latest session
    if (logoutDto?.sessionId) {
        const updated = await this.sessionRepo.findOne({ where: { id: logoutDto.sessionId, revoked: false } });
        if (updated) {
            updated.revoked = true;
            await this.sessionRepo.save(updated);
        }
    } else {
        const session = await this.sessionRepo.findOne({
            where: { user: { id: userId }, revoked: false },
            order: { createdAt: 'DESC' },
            relations: ['user'],
        });
        if (session) {
            session.revoked = true;
            await this.sessionRepo.save(session);
        }
    }
    return { message: 'Logged out successfully' };
    }

    async logoutAll(req: Request) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req as any);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    let verified: any;
    try {
        verified = this.jwtService.verify(token);
    } catch (err) {
        throw new UnauthorizedException('Invalid or expired token');
    }

    const userId = verified?.sub;
    const exp = verified?.exp;
    if (!userId || !exp) {
        throw new UnauthorizedException('Invalid token payload');
    }

    const expiresAt = new Date(exp * 1000);

    await this.revokedTokenRepo.save({ token, userId, expiresAt });

    const sessions = await this.sessionRepo.find({
        where: { user: { id: userId }, revoked: false },
        relations: ['user'],
    });
    if (sessions.length > 0) {
        for (const s of sessions) {
            s.revoked = true;
        }
        await this.sessionRepo.save(sessions);
    }

    return { message: 'Logged out from all sessions successfully' };
    }



    async refreshTokens(refreshPayload: RefreshTokenDto) {
    const { refreshToken } = refreshPayload;

    // 1. Verify the refresh token
    let payload: any;
    try {
        payload = this.jwtService.verify(refreshToken);
    } catch (err) {
        throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Find the session by refresh token
    const session = await this.sessionRepo.findOne({
        where: { refreshToken },
        relations: ['user'],
    });

    if (!session || session.revoked || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Session is invalid or expired');
    }

    // 3. Rotate tokens
    const newPayload = {
        sub: session.user.id,
        email: session.user.email,
        roles: session.user.role,
        sessionId: session.id,
    };

    const newAccessToken = this.jwtService.sign(newPayload, { expiresIn: '15m' });
    const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

    // 4. Update session with new refresh token
    session.refreshToken = newRefreshToken;
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.sessionRepo.save(session);

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        sessionId: session.id,
    };
    }


}
