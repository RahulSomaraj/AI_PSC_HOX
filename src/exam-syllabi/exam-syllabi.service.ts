import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { ExamSyllabus } from './entities/exam-syllabus.entity';
import { ExamStage } from '../exam-stages/entities/exam-stage.entity';
import { ExamSyllabusItem } from '../exam-syllabus-items/entities/exam-syllabus-item.entity';
import { CreateExamSyllabusDto } from './dto/create-exam-syllabus.dto';
import { UpdateExamSyllabusDto } from './dto/update-exam-syllabus.dto';

// Postgres unique_violation - the partial index on (examStageId).
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class ExamSyllabiService {
  constructor(
    @InjectRepository(ExamSyllabus)
    private readonly examSyllabusRepository: Repository<ExamSyllabus>,
    @InjectRepository(ExamStage)
    private readonly examStageRepository: Repository<ExamStage>,
    @InjectRepository(ExamSyllabusItem)
    private readonly examSyllabusItemRepository: Repository<ExamSyllabusItem>,
  ) {}

  /**
   * The stage must exist and be live, and examPostId must be the post that
   * owns it.
   *
   * The post is derivable from the stage, so a mismatch is always a mistake
   * on the caller's side rather than a choice - architecture.md calls the
   * column "kept in step with the stage", and this is where that is kept.
   */
  private async assertStageAndPost(examStageId: number, examPostId: number) {
    const stage = await this.examStageRepository.findOne({
      where: { id: examStageId, deletedAt: IsNull() },
      select: { id: true, examPostId: true },
    });
    if (!stage) {
      throw new NotFoundException(`Exam stage with ID ${examStageId} not found`);
    }
    if (stage.examPostId !== examPostId) {
      throw new BadRequestException(
        `Exam stage ${examStageId} belongs to exam post ${stage.examPostId}, not ${examPostId}`,
      );
    }
  }

  /**
   * A stage carries at most one live syllabus. `excludeId` keeps an update
   * from colliding with the row it is updating.
   */
  private async assertStageFree(examStageId: number, excludeId?: number) {
    const clash = await this.examSyllabusRepository.findOne({
      where: {
        examStageId,
        deletedAt: IsNull(),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(
        'This exam stage already has a live syllabus',
      );
    }
  }

  async create(createExamSyllabusDto: CreateExamSyllabusDto, userId: number) {
    try {
      const title = createExamSyllabusDto.title.trim();

      await this.assertStageAndPost(
        createExamSyllabusDto.examStageId,
        createExamSyllabusDto.examPostId,
      );
      await this.assertStageFree(createExamSyllabusDto.examStageId);

      const syllabus = this.examSyllabusRepository.create({
        ...createExamSyllabusDto,
        title,
        createdBy: userId,
      });
      return await this.examSyllabusRepository.save(syllabus);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // The check above loses a race; the index is the real guarantee.
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'This exam stage already has a live syllabus',
        );
      }
      throw new InternalServerErrorException('Failed to create exam syllabus');
    }
  }

  async findAll(examPostId?: number, examStageId?: number) {
    try {
      return await this.examSyllabusRepository.find({
        where: {
          deletedAt: IsNull(),
          ...(examPostId ? { examPostId } : {}),
          ...(examStageId ? { examStageId } : {}),
        },
        order: { id: 'DESC' },
      });
    } catch (err) {
      throw new InternalServerErrorException(
        'Failed to retrieve exam syllabi',
      );
    }
  }

  async findOne(id: number) {
    try {
      const syllabus = await this.examSyllabusRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!syllabus) {
        throw new NotFoundException('Exam syllabus not found');
      }
      return syllabus;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch exam syllabus');
    }
  }

  async update(
    id: number,
    updateExamSyllabusDto: UpdateExamSyllabusDto,
    userId: number,
  ) {
    try {
      const syllabus = await this.findOne(id);

      // Either id may move, so both are resolved before anything is checked:
      // a request may change the stage, restate the post, or both.
      const examStageId =
        updateExamSyllabusDto.examStageId ?? syllabus.examStageId;
      const examPostId =
        updateExamSyllabusDto.examPostId ?? syllabus.examPostId;
      const title = updateExamSyllabusDto.title?.trim() ?? syllabus.title;

      // Re-checked whenever either side moves, not just the stage: restating
      // examPostId alone can put the pair out of step just as easily.
      if (
        examStageId !== syllabus.examStageId ||
        examPostId !== syllabus.examPostId
      ) {
        await this.assertStageAndPost(examStageId, examPostId);
      }

      if (examStageId !== syllabus.examStageId) {
        await this.assertStageFree(examStageId, id);
      }

      Object.assign(syllabus, updateExamSyllabusDto, {
        examStageId,
        examPostId,
        title,
        updatedBy: userId,
      });
      return await this.examSyllabusRepository.save(syllabus);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'This exam stage already has a live syllabus',
        );
      }
      throw new InternalServerErrorException('Failed to update exam syllabus');
    }
  }

  async remove(id: number, userId: number): Promise<{ message: string }> {
    try {
      const syllabus = await this.findOne(id);

      // Items are CASCADE, which covers hard deletes only. Soft deleting the
      // syllabus would leave them behind, pointing at a row nothing can see -
      // and since items are hard-deleted, cascading the soft delete would
      // destroy them irrecoverably while the parent stayed restorable. That
      // asymmetry is worse than the awkwardness of refusing, so this refuses.
      const items = await this.examSyllabusItemRepository.count({
        where: { syllabusId: syllabus.id },
      });
      if (items > 0) {
        throw new ConflictException(
          `Cannot delete this syllabus: ${items} item${items === 1 ? ' is' : 's are'} still in it`,
        );
      }

      await this.examSyllabusRepository.update(syllabus.id, {
        deletedAt: new Date(),
        deletedBy: userId,
      });
      return {
        message: `Exam syllabus with ID ${id} has been successfully removed`,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete exam syllabus');
    }
  }
}
