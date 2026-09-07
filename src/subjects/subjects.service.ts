import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Subject } from './entities/subject.entity';
import { Question } from '../questions/entities/question.entity';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

// Postgres unique_violation. The partial index only covers live rows, so a
// duplicate name is reported when it collides with a subject that has not
// been soft-deleted.
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
  ) {}

  async create(createSubjectDto: CreateSubjectDto, userId: number) {
    try {
      const name = createSubjectDto.name.trim();

      const exists = await this.subjectRepository.findOne({
        where: { name, deletedAt: IsNull() },
      });
      if (exists) {
        throw new ConflictException('A subject with this name already exists');
      }

      const subject = this.subjectRepository.create({
        ...createSubjectDto,
        name,
        createdBy: userId,
      });
      return await this.subjectRepository.save(subject);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // The pre-check above loses a race; the index is the real guarantee.
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException('A subject with this name already exists');
      }
      throw new InternalServerErrorException('Failed to create subject');
    }
  }

  async findAll() {
    try {
      return await this.subjectRepository.find({
        where: { deletedAt: IsNull() },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch (err) {
      throw new InternalServerErrorException('Failed to retrieve subjects');
    }
  }

  async findOne(id: number) {
    try {
      const subject = await this.subjectRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!subject) {
        throw new NotFoundException('Subject not found');
      }
      return subject;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch subject');
    }
  }

  async update(id: number, updateSubjectDto: UpdateSubjectDto, userId: number) {
    try {
      const subject = await this.findOne(id);

      Object.assign(subject, updateSubjectDto, { updatedBy: userId });
      return await this.subjectRepository.save(subject);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException('A subject with this name already exists');
      }
      throw new InternalServerErrorException('Failed to update subject');
    }
  }

  async remove(id: number, userId: number): Promise<{ message: string }> {
    try {
      const subject = await this.findOne(id);

      // The FK is RESTRICT, but that only governs hard deletes. Soft
      // deleting a subject out from under its questions would leave them
      // tagged to a row nothing can see, so it is refused here instead.
      //
      // isActive is not part of the count: questions have no deletedAt, and
      // a deactivated question still holds the tag.
      const questions = await this.questionRepository.count({
        where: { subjectId: subject.id },
      });
      if (questions > 0) {
        throw new ConflictException(
          `Cannot delete this subject: ${questions} question${questions === 1 ? ' is' : 's are'} still tagged to it`,
        );
      }

      await this.subjectRepository.update(subject.id, {
        deletedAt: new Date(),
        deletedBy: userId,
      });
      return { message: `Subject with ID ${id} has been successfully removed` };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete subject');
    }
  }
}
