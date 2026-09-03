import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamPostsService } from './exam-posts.service';
import { ExamPostsController } from './exam-posts.controller';
import { ExamPost } from './entities/exam-post.entity';
import { ExamLevel } from '../exam-levels/entities/exam-level.entity';
import { ExamStage } from '../exam-stages/entities/exam-stage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExamPost, ExamLevel, ExamStage])],
  controllers: [ExamPostsController],
  providers: [ExamPostsService],
  exports: [ExamPostsService],
})
export class ExamPostsModule {}
