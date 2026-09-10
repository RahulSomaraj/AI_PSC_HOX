import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchesService } from './batches.service';
import { BatchesController } from './batches.controller';
import { Batch } from './entities/batch.entity';
<<<<<<< HEAD
import { ExamPost } from '../exam-posts/entities/exam-post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Batch, ExamPost])],
=======
import { AspirantProfile } from '../aspirant-profiles/entities/aspirant-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Batch, AspirantProfile])],
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  controllers: [BatchesController],
  providers: [BatchesService],
  exports: [BatchesService],
})
export class BatchesModule {}
