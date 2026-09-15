import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ExamPostsController } from './exam-posts.controller';
import { ExamPostsService } from './exam-posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

/**
 * The catalogue answers at both `/exams` and `/exam-posts`: the console reads
 * `/exam-posts`, everything else in the API already uses `/exams`.
 */
describe('Exam catalogue paths', () => {
  let app: INestApplication;
  const catalogue = [{ id: 1, name: 'LDC', examLevelId: 2 }];
  const service = {
    findAll: jest.fn().mockResolvedValue(catalogue),
    findOneWithStages: jest.fn().mockResolvedValue({ id: 1, stages: [] }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ExamPostsController],
      providers: [{ provide: ExamPostsService, useValue: service }, RolesGuard],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          const role = req.headers.authorization?.replace('Bearer ', '');
          if (!role) throw new UnauthorizedException();
          req.user = { userId: 7, roles: [role] };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useLogger(false);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => jest.clearAllMocks());

  it.each(['/exams', '/exam-posts'])(
    'lists the catalogue as a plain array at %s',
    async (path) => {
      const response = await request(app.getHttpServer())
        .get(path)
        .set('Authorization', 'Bearer admin')
        .expect(200);

      expect(response.body).toEqual(catalogue);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['/exams/1', '/exam-posts/1'])(
    'reads one catalogue exam at %s',
    async (path) => {
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', 'Bearer admin')
        .expect(200);

      expect(service.findOneWithStages).toHaveBeenCalledWith(1);
    },
  );

  it('applies the same guard at the new path', async () => {
    await request(app.getHttpServer()).get('/exam-posts').expect(401);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('passes filters through at the new path', async () => {
    await request(app.getHttpServer())
      .get('/exam-posts?examLevelId=2&search=LDC')
      .set('Authorization', 'Bearer admin')
      .expect(200);

    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ examLevelId: 2, search: 'LDC' }),
    );
  });
});
