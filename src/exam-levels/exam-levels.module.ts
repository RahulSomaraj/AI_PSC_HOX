import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamLevelsService } from './exam-levels.service';
import { ExamLevelsController } from './exam-levels.controller';
import { ExamLevel } from './entities/exam-level.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';

// ExamPost is in forFeature for the child guard in remove(): a level cannot
// be soft-deleted while live posts are filed under it. Only the entity is
// imported, not ExamPostsModule, so the three modules in this hierarchy stay
// free of circular imports. Same arrangement BatchesModule has with
// AspirantProfile.
@Module({
  imports: [TypeOrmModule.forFeature([ExamLevel, ExamPost])],
  controllers: [ExamLevelsController],
  providers: [ExamLevelsService],
  exports: [ExamLevelsService],
})
export class ExamLevelsModule {}
