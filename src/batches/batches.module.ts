import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchesService } from './batches.service';
import { BatchesController } from './batches.controller';
import { Batch } from './entities/batch.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Batch, ExamPost])],
  controllers: [BatchesController],
  providers: [BatchesService],
  exports: [BatchesService],
})
export class BatchesModule {}
