import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { Question } from './entities/question.entity';
import { Course } from '../course/entities/course.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Question, Course, User])
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService]
})
export class QuestionsModule {}
