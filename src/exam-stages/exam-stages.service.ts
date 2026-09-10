import {
<<<<<<< HEAD
  BadRequestException,
=======
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
<<<<<<< HEAD
import { FindOptionsWhere, ILike, In, Not, Repository } from 'typeorm';
import { ExamStage } from './entities/exam-stage.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';
import { ExamSyllabus } from '../syllabus/entities/exam-syllabus.entity';
import { CreateExamStageDto } from './dto/create-exam-stage.dto';
import { UpdateExamStageDto } from './dto/update-exam-stage.dto';
import { ReorderExamStagesDto } from './dto/reorder-exam-stages.dto';
=======
import { IsNull, Not, Repository } from 'typeorm';
import { ExamStage } from './entities/exam-stage.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';
import { ExamSyllabus } from '../exam-syllabi/entities/exam-syllabus.entity';
import { CreateExamStageDto } from './dto/create-exam-stage.dto';
import { UpdateExamStageDto } from './dto/update-exam-stage.dto';

// Postgres unique_violation - the partial index on (examPostId, name).
const UNIQUE_VIOLATION = '23505';
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1

@Injectable()
export class ExamStagesService {
  constructor(
    @InjectRepository(ExamStage)
    private readonly examStageRepository: Repository<ExamStage>,
    @InjectRepository(ExamPost)
    private readonly examPostRepository: Repository<ExamPost>,
    @InjectRepository(ExamSyllabus)
<<<<<<< HEAD
    private readonly syllabusRepository: Repository<ExamSyllabus>,
  ) {}

  async create(
    createExamStageDto: CreateExamStageDto,
    actorId?: number,
  ): Promise<ExamStage> {
    try {
      await this.assertExamExists(createExamStageDto.examId);
      await this.assertNameIsFree(
        createExamStageDto.examId,
        createExamStageDto.name,
      );

      const stage = this.examStageRepository.create({
        ...createExamStageDto,
        stageOrder:
          createExamStageDto.stageOrder ??
          (await this.nextStageOrder(createExamStageDto.examId)),
        createdBy: actorId ?? null,
      });
      return await this.examStageRepository.save(stage);
    } catch (err) {
      if (err instanceof HttpException) throw err;
=======
    private readonly examSyllabusRepository: Repository<ExamSyllabus>,
  ) {}

  /**
   * The DTOs carry marks as numbers, which is the right shape on the wire,
   * but the columns are numeric and the pg driver reads and writes them as
   * strings to keep the precision exact. toFixed(2) matches the scale the
   * columns declare, so 100 is stored as "100.00" rather than depending on
   * whatever the driver would make of a float.
   */
  private toMarks(value: number | undefined): string | undefined {
    return value === undefined ? undefined : value.toFixed(2);
  }

  /** A stage may only hang off a post that exists and is still live. */
  private async assertExamPostExists(examPostId: number) {
    const examPost = await this.examPostRepository.findOne({
      where: { id: examPostId, deletedAt: IsNull() },
      select: { id: true },
    });
    if (!examPost) {
      throw new NotFoundException('Exam post not found');
    }
  }

  /**
   * Rejects a name already taken under the same post. `excludeId` keeps an
   * update from colliding with the row it is updating.
   */
  private async assertNameFree(
    examPostId: number,
    name: string,
    excludeId?: number,
  ) {
    const clash = await this.examStageRepository.findOne({
      where: {
        examPostId,
        name,
        deletedAt: IsNull(),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(
        'An exam stage with this name already exists for this post',
      );
    }
  }

  async create(createExamStageDto: CreateExamStageDto, userId: number) {
    try {
      const { totalMarks, negativeMark, ...rest } = createExamStageDto;
      const name = createExamStageDto.name.trim();

      await this.assertExamPostExists(createExamStageDto.examPostId);
      await this.assertNameFree(createExamStageDto.examPostId, name);

      const examStage = this.examStageRepository.create({
        ...rest,
        name,
        totalMarks: this.toMarks(totalMarks) ?? null,
        negativeMark: this.toMarks(negativeMark) ?? null,
        createdBy: userId,
      });
      return await this.examStageRepository.save(examStage);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // The check above loses a race; the index is the real guarantee.
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'An exam stage with this name already exists for this post',
        );
      }
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      throw new InternalServerErrorException('Failed to create exam stage');
    }
  }

<<<<<<< HEAD
  async findAll(
    filters: {
      examId?: number;
      isActive?: boolean;
      search?: string;
    } = {},
  ): Promise<ExamStage[]> {
    try {
      const where: FindOptionsWhere<ExamStage> = {};
      if (filters.examId !== undefined) where.examId = filters.examId;
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.search) where.name = ILike(`%${filters.search}%`);

      return await this.examStageRepository.find({
        where,
        relations: ['exam'],
        order: { examId: 'ASC', stageOrder: 'ASC', name: 'ASC' },
      });
    } catch {
=======
  async findAll(examPostId?: number) {
    try {
      return await this.examStageRepository.find({
        where: {
          deletedAt: IsNull(),
          ...(examPostId ? { examPostId } : {}),
        },
        // stageOrder first: the sequence a candidate sits the stages in is
        // the order an admin expects to see them listed.
        order: { stageOrder: 'ASC', name: 'ASC' },
      });
    } catch (err) {
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      throw new InternalServerErrorException('Failed to retrieve exam stages');
    }
  }

<<<<<<< HEAD
  async findOne(id: number): Promise<ExamStage> {
    try {
      const stage = await this.examStageRepository.findOne({
        where: { id },
        relations: ['exam'],
      });
      if (!stage) {
        throw new NotFoundException(`Exam stage with ID ${id} not found`);
      }
      return stage;
=======
  async findOne(id: number) {
    try {
      const examStage = await this.examStageRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!examStage) {
        throw new NotFoundException('Exam stage not found');
      }
      return examStage;
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch exam stage');
    }
  }

  async update(
    id: number,
    updateExamStageDto: UpdateExamStageDto,
<<<<<<< HEAD
    actorId?: number,
  ): Promise<ExamStage> {
    try {
      const stage = await this.findOne(id);

      if (updateExamStageDto.name && updateExamStageDto.name !== stage.name) {
        await this.assertNameIsFree(stage.examId, updateExamStageDto.name, id);
      }

      Object.assign(stage, updateExamStageDto, { updatedBy: actorId ?? null });
      return await this.examStageRepository.save(stage);
    } catch (err) {
      if (err instanceof HttpException) throw err;
=======
    userId: number,
  ) {
    try {
      const examStage = await this.findOne(id);
      const { totalMarks, negativeMark, ...rest } = updateExamStageDto;

      // A request may change the parent, the name, both or neither, so both
      // sides of the uniqueness check are resolved before comparing.
      const examPostId = updateExamStageDto.examPostId ?? examStage.examPostId;
      const name = updateExamStageDto.name?.trim() ?? examStage.name;

      if (updateExamStageDto.examPostId !== undefined) {
        await this.assertExamPostExists(examPostId);
      }

      if (examPostId !== examStage.examPostId || name !== examStage.name) {
        await this.assertNameFree(examPostId, name, id);
      }

      Object.assign(examStage, rest, {
        examPostId,
        name,
        updatedBy: userId,
      });

      // Assigned separately from the spread: the marks need converting, and
      // an absent field must leave the stored value alone rather than
      // blanking it.
      const marks = this.toMarks(totalMarks);
      if (marks !== undefined) examStage.totalMarks = marks;

      const negative = this.toMarks(negativeMark);
      if (negative !== undefined) examStage.negativeMark = negative;

      return await this.examStageRepository.save(examStage);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'An exam stage with this name already exists for this post',
        );
      }
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      throw new InternalServerErrorException('Failed to update exam stage');
    }
  }

<<<<<<< HEAD
  async setStatus(
    id: number,
    isActive: boolean,
    actorId?: number,
  ): Promise<ExamStage> {
    return await this.update(id, { isActive }, actorId);
  }

  /**
   * Rewrites `stageOrder` for a whole exam in one transaction, so the list
   * is never observed half-reordered.
   */
  async reorder(
    reorderDto: ReorderExamStagesDto,
    actorId?: number,
  ): Promise<ExamStage[]> {
    try {
      await this.assertExamExists(reorderDto.examId);

      const ids = reorderDto.items.map((item) => item.id);
      if (new Set(ids).size !== ids.length) {
        throw new BadRequestException('Duplicate stage IDs in the request');
      }

      const stages = await this.examStageRepository.find({
        where: { id: In(ids), examId: reorderDto.examId },
      });
      if (stages.length !== ids.length) {
        throw new BadRequestException(
          `All stages must belong to exam ${reorderDto.examId}`,
        );
      }

      await this.examStageRepository.manager.transaction(async (manager) => {
        for (const item of reorderDto.items) {
          await manager.update(ExamStage, item.id, {
            stageOrder: item.stageOrder,
            updatedBy: actorId ?? null,
          });
        }
      });

      return await this.findAll({ examId: reorderDto.examId });
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to reorder exam stages');
    }
  }

  /** Soft delete, blocked while a syllabus is still attached to the stage. */
  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    try {
      const stage = await this.findOne(id);

      const syllabusCount = await this.syllabusRepository.count({
        where: { examStageId: id },
      });
      if (syllabusCount > 0) {
        throw new ConflictException(
          `Exam stage with ID ${id} still has a syllabus. Delete the syllabus first.`,
        );
      }

      stage.deletedBy = actorId ?? null;
      await this.examStageRepository.save(stage);
      await this.examStageRepository.softDelete(id);

=======
  async remove(id: number, userId: number): Promise<{ message: string }> {
    try {
      const examStage = await this.findOne(id);

      // The FK is RESTRICT, but that only governs hard deletes. Soft
      // deleting a stage out from under its syllabus would leave it pointing
      // at a row nothing can see, so it is refused here instead.
      //
      // At most one live syllabus can exist per stage - the partial unique
      // index on exam_syllabi guarantees it - so this count is 0 or 1. It is
      // still written as a count for symmetry with the guards in
      // ExamLevelsService and ExamPostsService.
      const syllabi = await this.examSyllabusRepository.count({
        where: { examStageId: examStage.id, deletedAt: IsNull() },
      });
      if (syllabi > 0) {
        throw new ConflictException(
          'Cannot delete this exam stage: a syllabus is still attached to it',
        );
      }

      await this.examStageRepository.update(examStage.id, {
        deletedAt: new Date(),
        deletedBy: userId,
      });
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      return {
        message: `Exam stage with ID ${id} has been successfully removed`,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete exam stage');
    }
  }
<<<<<<< HEAD

  private async assertExamExists(examId: number): Promise<void> {
    const exam = await this.examPostRepository.findOne({
      where: { id: examId },
    });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }
  }

  private async assertNameIsFree(
    examId: number,
    name: string,
    ignoreId?: number,
  ): Promise<void> {
    const where: FindOptionsWhere<ExamStage> = { examId, name };
    if (ignoreId !== undefined) where.id = Not(ignoreId);

    const existing = await this.examStageRepository.findOne({ where });
    if (existing) {
      throw new ConflictException(
        `Stage "${name}" already exists for exam ${examId}`,
      );
    }
  }

  /** Appends new stages after the ones already defined for the exam. */
  private async nextStageOrder(examId: number): Promise<number> {
    const last = await this.examStageRepository.findOne({
      where: { examId },
      order: { stageOrder: 'DESC' },
    });
    return last ? last.stageOrder + 1 : 1;
  }
=======
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
}
