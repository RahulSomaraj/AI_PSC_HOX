import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { Subject } from './entities/subject.entity';
import { Question } from '../questions/entities/question.entity';

@Module({
  // Question is in forFeature for the guard in remove(): a subject cannot be
  // soft-deleted while questions are still tagged to it. QuestionsModule
  // holds Subject for assertTaxonomy - entities both ways, modules neither.
  imports: [TypeOrmModule.forFeature([Subject, Question])],
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
