import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionLanguage, QuestionStatus } from './question-fields.enum';

/**
 * The body the console's Add Question form sends when an admin saves a draft
 * straight away: only the text filled in. Mirrors `toQuestionPayload` in the
 * console, including the NaN marks and time that serialise to null.
 */
const consoleDraft = {
  courseId: 1,
  subjectId: null,
  topicId: null,
  subtopicId: null,
  question: '<p>Which article guarantees equality before law?</p>',
  answers: ['', '', '', ''],
  correctAnswer: '',
  description: null,
  descriptionLink: null,
  difficulty: 3,
  points: null,
  explanation: null,
  tags: null,
  isActive: true,
  imageUrl: null,
  examLevelId: null,
  type: null,
  year: null,
  language: 'en',
  timeSeconds: null,
  status: 'draft',
};

const consolePublished = {
  ...consoleDraft,
  answers: ['Article 14', 'Article 19', 'Article 21', 'Article 32'],
  correctAnswer: 'Article 14',
  points: 2,
  timeSeconds: 60,
  status: 'published',
};

function queryBuilder(records: unknown[] = [], total = 0) {
  const qb: any = {};
  for (const method of [
    'leftJoinAndSelect',
    'where',
    'andWhere',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
  ]) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.getMany = jest.fn().mockResolvedValue(records);
  qb.getManyAndCount = jest.fn().mockResolvedValue([records, total]);
  return qb;
}

describe('QuestionsService', () => {
  let questions: any;
  let qb: any;
  let service: QuestionsService;

  beforeEach(() => {
    qb = queryBuilder();
    questions = {
      create: jest.fn((value) => ({ ...value })),
      save: jest.fn((value) => Promise.resolve({ id: 7, ...value })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    const exists = { findOne: jest.fn(), existsBy: jest.fn() };
    service = new QuestionsService(
      questions,
      exists as any,
      exists as any,
      exists as any,
      {} as any,
      {} as any,
    );
  });

  describe('the console payload against main.ts validation', () => {
    const errorsFor = async (dtoClass: any, body: object) =>
      validate(plainToInstance(dtoClass, body), {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

    it('passes a draft saved with only the text filled in', async () => {
      expect(await errorsFor(CreateQuestionDto, consoleDraft)).toEqual([]);
    });

    it('passes a fully filled question being published', async () => {
      expect(await errorsFor(CreateQuestionDto, consolePublished)).toEqual([]);
    });

    it('passes the same payload as a PATCH', async () => {
      expect(await errorsFor(UpdateQuestionDto, consolePublished)).toEqual([]);
    });

    it('rejects a language the bank does not offer', async () => {
      const errors = await errorsFor(CreateQuestionDto, {
        ...consoleDraft,
        language: 'hi',
      });
      expect(errors.map((e) => e.property)).toContain('language');
    });
  });

  describe('create', () => {
    it('saves a draft that has no correct answer yet', async () => {
      await expect(
        service.create(consoleDraft as any, 1),
      ).resolves.toBeDefined();
    });

    it('defaults a question with no status to draft', async () => {
      const { status: _status, ...noStatus } = consoleDraft;

      await service.create(noStatus as any, 1);

      expect(questions.create.mock.calls[0][0].status).toBe(
        QuestionStatus.Draft,
      );
    });

    it('defaults the language to English', async () => {
      const { language: _language, ...noLanguage } = consoleDraft;

      await service.create(noLanguage as any, 1);

      expect(questions.create.mock.calls[0][0].language).toBe(
        QuestionLanguage.English,
      );
    });

    it('stores the Question Bank fields', async () => {
      await service.create(
        { ...consolePublished, imageUrl: 'https://cdn/q.png' } as any,
        1,
      );

      expect(questions.create.mock.calls[0][0]).toMatchObject({
        status: QuestionStatus.Published,
        language: QuestionLanguage.English,
        timeSeconds: 60,
        imageUrl: 'https://cdn/q.png',
      });
    });

    it('does not store type, year or examLevelId', async () => {
      await service.create(
        { ...consoleDraft, type: 'prelims', year: 2024, examLevelId: 3 } as any,
        1,
      );

      const stored = questions.create.mock.calls[0][0];
      expect(stored).not.toHaveProperty('type');
      expect(stored).not.toHaveProperty('year');
      expect(stored).not.toHaveProperty('examLevelId');
    });

    it('refuses to publish a question with no correct answer', async () => {
      await expect(
        service.create({ ...consolePublished, correctAnswer: '' } as any, 1),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('still refuses a named answer that is not among the choices', async () => {
      await expect(
        service.create(
          { ...consolePublished, correctAnswer: 'Article 99' } as any,
          1,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('checks a draft that does name an answer, too', async () => {
      await expect(
        service.create(
          {
            ...consoleDraft,
            answers: ['A', 'B', 'C', 'D'],
            correctAnswer: 'E',
          } as any,
          1,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('responses', () => {
    it('carry a code derived from the id', async () => {
      const saved = await service.create(consoleDraft as any, 1);

      expect(saved.code).toBe('Q-007');
    });

    it.each([
      [1, 'Q-001'],
      [42, 'Q-042'],
      [1234, 'Q-1234'],
    ])('code id %i as %s', (id, code) => {
      expect(service.present({ id } as any).code).toBe(code);
    });

    it('carry type, year and examLevelId back as null', async () => {
      const saved = await service.create(
        { ...consoleDraft, type: 'prelims', year: 2024 } as any,
        1,
      );

      expect(saved).toMatchObject({
        type: null,
        year: null,
        examLevelId: null,
      });
    });
  });

  describe('update', () => {
    const storedDraft = () => ({
      id: 7,
      courseId: 1,
      subjectId: null,
      topicId: null,
      subtopicId: null,
      question: 'Text',
      answers: ['A', 'B', 'C', 'D'],
      correctAnswer: '',
      status: QuestionStatus.Draft,
      isActive: true,
    });

    it('refuses to publish a stored draft that has no answer marked', async () => {
      questions.findOne.mockResolvedValue(storedDraft());

      await expect(
        service.update(7, { status: QuestionStatus.Published }, 1),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(questions.save).not.toHaveBeenCalled();
    });

    it('publishes once the answer arrives in the same request', async () => {
      questions.findOne.mockResolvedValue(storedDraft());

      await expect(
        service.update(
          7,
          { status: QuestionStatus.Published, correctAnswer: 'B' },
          1,
        ),
      ).resolves.toMatchObject({ status: QuestionStatus.Published });
    });

    it('does not store type, year or examLevelId on update either', async () => {
      questions.findOne.mockResolvedValue(storedDraft());

      await service.update(7, { type: 'mains', year: 2023 } as any, 1);

      const saved = questions.save.mock.calls[0][0];
      expect(saved).not.toHaveProperty('type');
      expect(saved).not.toHaveProperty('year');
    });
  });

  describe('findAll', () => {
    it('returns the plain array when no page is asked for', async () => {
      qb.getMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const result = await service.findAll({});

      expect(Array.isArray(result)).toBe(true);
      expect(qb.skip).not.toHaveBeenCalled();
    });

    it('returns one page with totals when a page is asked for', async () => {
      qb.getManyAndCount.mockResolvedValue([[{ id: 1 }], 21]);

      const result: any = await service.findAll({ page: 3, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result).toMatchObject({
        total: 21,
        page: 3,
        limit: 10,
        totalPages: 3,
      });
      expect(result.data[0].code).toBe('Q-001');
    });

    it('finds a question by its code', async () => {
      await service.findAll({ search: 'Q-012' });

      expect(qb.andWhere).toHaveBeenCalledWith('question.id = :codeId', {
        codeId: 12,
      });
    });

    it('searches the question text otherwise', async () => {
      await service.findAll({ search: 'equality' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'question.question ILIKE :search',
        { search: '%equality%' },
      );
    });

    it('filters by language', async () => {
      await service.findAll({ language: QuestionLanguage.Malayalam });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'question.language = :language',
        { language: 'ml' },
      );
    });

    it('still leaves retired questions out', async () => {
      await service.findAll({});

      expect(qb.where).toHaveBeenCalledWith('question.isActive = :isActive', {
        isActive: true,
      });
    });
  });
});
