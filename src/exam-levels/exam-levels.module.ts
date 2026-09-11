import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamLevelsService } from './exam-levels.service';
import { ExamLevelsController } from './exam-levels.controller';
import { ExamLevel } from './entities/exam-level.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExamLevel, ExamPost])],
  controllers: [ExamLevelsController],
  providers: [ExamLevelsService],
  exports: [ExamLevelsService],
})
export class ExamLevelsModule {}
