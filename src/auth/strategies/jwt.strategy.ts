import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DataSource } from 'typeorm';
import { RevokedToken } from '../entities/revoked-token.entity';
import type { Request } from 'express';
import { UserSession } from '../entities/user-session.entity';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(private configService:ConfigService, private readonly dataSource: DataSource){
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
            passReqToCallback: true,
            });
        }
    
    async validate(
        req: Request,
        payload: { sub: number; email: string; roles?: string | string[]; sessionId?: string }
    ) {
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req as any);
        if (!token) {
            throw new UnauthorizedException('Missing Bearer token');
        }

        const revokedTokenRepo = this.dataSource.getRepository(RevokedToken);
        const revoked = await revokedTokenRepo.findOne({ where: { token }, select: { id: true } });
        if (revoked) {
            throw new UnauthorizedException('Token has been revoked');
        }

        // If sessionId exists in token, ensure the session is still valid
        if (payload.sessionId) {
            const sessionRepo = this.dataSource.getRepository(UserSession);
            const session = await sessionRepo.findOne({ where: { id: payload.sessionId } });
            if (!session || session.revoked || (session.user && (session.user as any).id && (session.user as any).id !== payload.sub)) {
                throw new UnauthorizedException('Session is invalid or revoked');
            }
        }

        const roles = Array.isArray(payload.roles) ? payload.roles : payload.roles ? [payload.roles] : [];
        return { userId: payload.sub, email: payload.email, roles, sessionId: payload.sessionId };
    }
}