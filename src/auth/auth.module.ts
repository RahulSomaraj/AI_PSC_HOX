import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from 'src/users/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RevokedToken } from './entities/revoked-token.entity';
import { JwtAuthGuard } from './guards/jwt.auth.guard';

@Module({
  imports:[TypeOrmModule.forFeature([User, RevokedToken]),
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory:async(config:ConfigService)=>({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' }, 
      }),
       inject:[ConfigService]
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService,JwtStrategy,JwtAuthGuard],
  exports: [JwtAuthGuard]
})
export class AuthModule {}
