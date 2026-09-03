import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AspirantProfilesService } from './aspirant-profiles.service';
import { AspirantProfilesController } from './aspirant-profiles.controller';
import { AspirantProfile } from './entities/aspirant-profile.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AspirantProfile, User])],
  controllers: [AspirantProfilesController],
  providers: [AspirantProfilesService],
  exports: [AspirantProfilesService],
})
export class AspirantProfilesModule {}
