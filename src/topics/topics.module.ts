import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';
import { Topic } from './entities/topic.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Question } from '../questions/entities/question.entity';

@Module({
  // Question is in forFeature for the guard in remove(): a topic cannot be
  // soft-deleted while questions are still tagged to it. QuestionsModule
  // holds Topic for assertTaxonomy - entities both ways, modules neither.
  imports: [TypeOrmModule.forFeature([Topic, Subject, Question])],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
