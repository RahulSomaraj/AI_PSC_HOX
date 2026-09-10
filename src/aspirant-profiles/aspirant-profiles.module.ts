import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AspirantProfilesService } from './aspirant-profiles.service';
import { AspirantProfilesController } from './aspirant-profiles.controller';
import { AspirantProfile } from './entities/aspirant-profile.entity';
import { User } from '../users/entities/user.entity';
import { Batch } from '../batches/entities/batch.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';

// ExamPost is in forFeature for assertExamPostExists: an aspirant may only
// target a live post, on create and on update. ExamPostsModule holds the
// AspirantProfile entity for the mirror-image guard in its remove(); both
// register entities rather than each other, so no cycle forms.
@Module({
  imports: [TypeOrmModule.forFeature([AspirantProfile, User, Batch, ExamPost])],
  controllers: [AspirantProfilesController],
  providers: [AspirantProfilesService],
  exports: [AspirantProfilesService],
})
export class AspirantProfilesModule {}
