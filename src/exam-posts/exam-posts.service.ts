import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
<<<<<<< HEAD
import { FindOptionsWhere, ILike, Not, Repository } from 'typeorm';
import { ExamPost } from './entities/exam-post.entity';
import { ExamLevel } from '../exam-levels/entities/exam-level.entity';
import { ExamStage } from '../exam-stages/entities/exam-stage.entity';
import { CreateExamPostDto } from './dto/create-exam-post.dto';
import { UpdateExamPostDto } from './dto/update-exam-post.dto';

=======
import { IsNull, Not, Repository } from 'typeorm';
import { ExamPost } from './entities/exam-post.entity';
import { ExamLevel } from '../exam-levels/entities/exam-level.entity';
import { ExamStage } from '../exam-stages/entities/exam-stage.entity';
import { AspirantProfile } from '../aspirant-profiles/entities/aspirant-profile.entity';
import { CreateExamPostDto } from './dto/create-exam-post.dto';
import { UpdateExamPostDto } from './dto/update-exam-post.dto';

// Postgres unique_violation - the partial index on (examLevelId, name).
const UNIQUE_VIOLATION = '23505';

>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
@Injectable()
export class ExamPostsService {
  constructor(
    @InjectRepository(ExamPost)
    private readonly examPostRepository: Repository<ExamPost>,
    @InjectRepository(ExamLevel)
    private readonly examLevelRepository: Repository<ExamLevel>,
    @InjectRepository(ExamStage)
    private readonly examStageRepository: Repository<ExamStage>,
<<<<<<< HEAD
  ) {}

  async create(
    createExamPostDto: CreateExamPostDto,
    actorId?: number,
  ): Promise<ExamPost> {
    try {
      await this.assertLevelExists(createExamPostDto.examLevelId);
      await this.assertNameIsFree(
        createExamPostDto.examLevelId,
        createExamPostDto.name,
      );

      const exam = this.examPostRepository.create({
        ...createExamPostDto,
        createdBy: actorId ?? null,
      });
      return await this.examPostRepository.save(exam);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to create exam');
    }
  }

  async findAll(
    filters: {
      examLevelId?: number;
      isActive?: boolean;
      search?: string;
    } = {},
  ): Promise<ExamPost[]> {
    try {
      const where: FindOptionsWhere<ExamPost> = {};
      if (filters.examLevelId !== undefined) {
        where.examLevelId = filters.examLevelId;
      }
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.search) where.name = ILike(`%${filters.search}%`);

      return await this.examPostRepository.find({
        where,
        relations: ['examLevel'],
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch {
      throw new InternalServerErrorException('Failed to retrieve exams');
    }
  }

  async findOne(id: number): Promise<ExamPost> {
    try {
      const exam = await this.examPostRepository.findOne({
        where: { id },
        relations: ['examLevel'],
      });
      if (!exam) {
        throw new NotFoundException(`Exam with ID ${id} not found`);
      }
      return exam;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch exam');
    }
  }

  /** The exam together with its stages, ordered the way they are conducted. */
  async findOneWithStages(
    id: number,
  ): Promise<ExamPost & { stages: ExamStage[] }> {
    const exam = await this.findOne(id);
    const stages = await this.examStageRepository.find({
      where: { examId: id },
      order: { stageOrder: 'ASC', name: 'ASC' },
    });
    return Object.assign(exam, { stages });
  }

  async update(
    id: number,
    updateExamPostDto: UpdateExamPostDto,
    actorId?: number,
  ): Promise<ExamPost> {
    try {
      const exam = await this.findOne(id);

      const examLevelId = updateExamPostDto.examLevelId ?? exam.examLevelId;
      if (
        updateExamPostDto.examLevelId !== undefined &&
        updateExamPostDto.examLevelId !== exam.examLevelId
      ) {
        await this.assertLevelExists(examLevelId);
      }

      const name = updateExamPostDto.name ?? exam.name;
      if (name !== exam.name || examLevelId !== exam.examLevelId) {
        await this.assertNameIsFree(examLevelId, name, id);
      }

      Object.assign(exam, updateExamPostDto, { updatedBy: actorId ?? null });
      return await this.examPostRepository.save(exam);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to update exam');
    }
  }

  async setStatus(
    id: number,
    isActive: boolean,
    actorId?: number,
  ): Promise<ExamPost> {
    return await this.update(id, { isActive }, actorId);
  }

  /** Soft delete, blocked while the exam still has stages. */
  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    try {
      const exam = await this.findOne(id);

      const stageCount = await this.examStageRepository.count({
        where: { examId: id },
      });
      if (stageCount > 0) {
        throw new ConflictException(
          `Exam with ID ${id} still has ${stageCount} stage(s). Delete them first.`,
        );
      }

      exam.deletedBy = actorId ?? null;
      await this.examPostRepository.save(exam);
      await this.examPostRepository.softDelete(id);

      return { message: `Exam with ID ${id} has been successfully removed` };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete exam');
    }
  }

  private async assertLevelExists(examLevelId: number): Promise<void> {
    const level = await this.examLevelRepository.findOne({
      where: { id: examLevelId },
    });
    if (!level) {
      throw new NotFoundException(
        `Exam level with ID ${examLevelId} not found`,
      );
    }
  }

  private async assertNameIsFree(
    examLevelId: number,
    name: string,
    ignoreId?: number,
  ): Promise<void> {
    const where: FindOptionsWhere<ExamPost> = { examLevelId, name };
    if (ignoreId !== undefined) where.id = Not(ignoreId);

    const existing = await this.examPostRepository.findOne({ where });
    if (existing) {
      throw new ConflictException(
        `Exam "${name}" already exists under exam level ${examLevelId}`,
      );
=======
    @InjectRepository(AspirantProfile)
    private readonly aspirantProfileRepository: Repository<AspirantProfile>,
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

      // Aspirants point at a post from the other direction, through
      // aspirant_profiles.target_exam_id. Same reasoning as the stage guard
      // above: RESTRICT covers hard deletes only, and soft deleting the post
      // would leave those profiles targeting a row nothing can see.
      const aspirants = await this.aspirantProfileRepository.count({
        where: { targetExamId: examPost.id, deletedAt: IsNull() },
      });
      if (aspirants > 0) {
        throw new ConflictException(
          `Cannot delete this exam post: ${aspirants} aspirant${aspirants === 1 ? ' is' : 's are'} still targeting it`,
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
    }
  }
}
