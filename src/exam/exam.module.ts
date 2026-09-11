import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { Exam } from './entities/exam.entity';
import { Course } from '../course/entities/course.entity';
import { QuestionsModule } from '../questions/questions.module';
import { AnswerLogModule } from '../answer-log/answer-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exam, Course]),
    QuestionsModule,
    // submit() records one answer row per question, in the same transaction
    // as the completed exam.
    AnswerLogModule,
  ],
  controllers: [ExamController],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {}


