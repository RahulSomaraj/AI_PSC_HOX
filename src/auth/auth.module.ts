import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RevokedToken } from './entities/revoked-token.entity';
import { JwtAuthGuard } from './guards/jwt.auth.guard';
import { UserSession } from './entities/user-session.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { EmailService } from '../shared/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      RevokedToken,
      UserSession,
      PasswordResetToken,
    ]),
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const jwtSecret = config.get<string>('JWT_SECRET');

        if (!jwtSecret) {
          throw new Error(
            'Missing required JWT_SECRET environment variable. Please check your .env file.',
          );
        }

        return {
          secret: jwtSecret,
          signOptions: { expiresIn: '1h' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, EmailService],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
