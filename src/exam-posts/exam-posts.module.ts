import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamPostsService } from './exam-posts.service';
import { ExamPostsController } from './exam-posts.controller';
import { ExamPost } from './entities/exam-post.entity';
import { ExamLevel } from '../exam-levels/entities/exam-level.entity';
import { ExamStage } from '../exam-stages/entities/exam-stage.entity';
import { AspirantProfile } from '../aspirant-profiles/entities/aspirant-profile.entity';

// Four entities, one for each direction this service reaches:
//   ExamPost        - its own rows
//   ExamLevel       - the parent, for assertExamLevelExists on create and reparent
//   ExamStage       - the children, for the guard in remove()
//   AspirantProfile - aspirants targeting the post, for the same guard
//
// Entities only, never the sibling modules: ExamLevelsModule already imports
// ExamPost for its own guard, and AspirantProfilesModule imports ExamPost for
// assertExamPostExists, so importing modules here would close a cycle.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExamPost,
      ExamLevel,
      ExamStage,
      AspirantProfile,
    ]),
  ],
  controllers: [ExamPostsController],
  providers: [ExamPostsService],
  exports: [ExamPostsService],
})
export class ExamPostsModule {}
