import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { ExamPost } from './entities/exam-post.entity';
import { ExamLevel } from '../exam-levels/entities/exam-level.entity';
import { ExamStage } from '../exam-stages/entities/exam-stage.entity';
import { CreateExamPostDto } from './dto/create-exam-post.dto';
import { UpdateExamPostDto } from './dto/update-exam-post.dto';

// Postgres unique_violation - the partial index on (examLevelId, name).
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class ExamPostsService {
  constructor(
    @InjectRepository(ExamPost)
    private readonly examPostRepository: Repository<ExamPost>,
    @InjectRepository(ExamLevel)
    private readonly examLevelRepository: Repository<ExamLevel>,
    @InjectRepository(ExamStage)
    private readonly examStageRepository: Repository<ExamStage>,
  ) {}

  /** A post may only hang off a level that exists and is still live. */
  private async assertExamLevelExists(examLevelId: number) {
    const examLevel = await this.examLevelRepository.findOne({
      where: { id: examLevelId, deletedAt: IsNull() },
      select: { id: true },
    });
    if (!examLevel) {
      throw new NotFoundException('Exam level not found');
    }
  }

  /**
   * Rejects a name already taken under the same level. `excludeId` keeps an
   * update from colliding with the row it is updating.
   */
  private async assertNameFree(
    examLevelId: number,
    name: string,
    excludeId?: number,
  ) {
    const clash = await this.examPostRepository.findOne({
      where: {
        examLevelId,
        name,
        deletedAt: IsNull(),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(
        'An exam post with this name already exists in this level',
      );
    }
  }

  async create(createExamPostDto: CreateExamPostDto, userId: number) {
    try {
      const name = createExamPostDto.name.trim();

      await this.assertExamLevelExists(createExamPostDto.examLevelId);
      await this.assertNameFree(createExamPostDto.examLevelId, name);

      const examPost = this.examPostRepository.create({
        ...createExamPostDto,
        name,
        createdBy: userId,
      });
      return await this.examPostRepository.save(examPost);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // The check above loses a race; the index is the real guarantee.
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'An exam post with this name already exists in this level',
        );
      }
      throw new InternalServerErrorException('Failed to create exam post');
    }
  }

  async findAll(examLevelId?: number) {
    try {
      return await this.examPostRepository.find({
        where: {
          deletedAt: IsNull(),
          ...(examLevelId ? { examLevelId } : {}),
        },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch (err) {
      throw new InternalServerErrorException('Failed to retrieve exam posts');
    }
  }

  async findOne(id: number) {
    try {
      const examPost = await this.examPostRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!examPost) {
        throw new NotFoundException('Exam post not found');
      }
      return examPost;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch exam post');
    }
  }

  async update(
    id: number,
    updateExamPostDto: UpdateExamPostDto,
    userId: number,
  ) {
    try {
      const examPost = await this.findOne(id);

      // A request may change the parent, the name, both or neither, so both
      // sides of the uniqueness check are resolved before comparing.
      const examLevelId =
        updateExamPostDto.examLevelId ?? examPost.examLevelId;
      const name = updateExamPostDto.name?.trim() ?? examPost.name;

      if (updateExamPostDto.examLevelId !== undefined) {
        await this.assertExamLevelExists(examLevelId);
      }

      if (examLevelId !== examPost.examLevelId || name !== examPost.name) {
        await this.assertNameFree(examLevelId, name, id);
      }

      Object.assign(examPost, updateExamPostDto, {
        examLevelId,
        name,
        updatedBy: userId,
      });
      return await this.examPostRepository.save(examPost);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'An exam post with this name already exists in this level',
        );
      }
      throw new InternalServerErrorException('Failed to update exam post');
    }
  }

  async remove(id: number, userId: number): Promise<{ message: string }> {
    try {
      const examPost = await this.findOne(id);

      // The FK is RESTRICT, but that only governs hard deletes. Soft
      // deleting a post out from under its stages would leave them pointing
      // at a row nothing can see, so it is refused here instead.
      const stages = await this.examStageRepository.count({
        where: { examPostId: examPost.id, deletedAt: IsNull() },
      });
      if (stages > 0) {
        throw new ConflictException(
          `Cannot delete this exam post: ${stages} exam stage${stages === 1 ? ' is' : 's are'} still defined for it`,
        );
      }

      await this.examPostRepository.update(examPost.id, {
        deletedAt: new Date(),
        deletedBy: userId,
      });
      return {
        message: `Exam post with ID ${id} has been successfully removed`,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete exam post');
    }
  }
}
