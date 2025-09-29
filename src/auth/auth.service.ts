import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthPayloadDto } from './dto/auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepositories:Repository<User>,private jwtService:JwtService){}

    async validateUser(authPayloadDto:AuthPayloadDto){

        const email = authPayloadDto.email?.trim().toLowerCase();

        const findUser = await this.userRepositories.findOne({
        where: { email },
        select: { id: true, email: true, passwordHash: true },
        });

    
        if (!findUser) {
        throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid=await argon2.verify(findUser.passwordHash,authPayloadDto.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        
        const payload = { sub: findUser.id, email: findUser.email };
        const accessToken=this.jwtService.sign(payload);   
        return {accessToken};
    }
}
