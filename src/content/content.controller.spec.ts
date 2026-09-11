jest.mock('../batches/entities/batch.entity', () => ({
  Batch: class Batch {},
}));
jest.mock('../subjects/entities/subject.entity', () => ({
  Subject: class Subject {},
}));
jest.mock('../topics/entities/topic.entity', () => ({
  Topic: class Topic {},
}));
jest.mock('../subtopics/entities/subtopic.entity', () => ({
  Subtopic: class Subtopic {},
}));
jest.mock('../aspirant-profiles/entities/aspirant-profile.entity', () => ({
  AspirantProfile: class AspirantProfile {},
}));

import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('Content HTTP contract', () => {
  let app: INestApplication;
  const service = {
    create: jest.fn().mockResolvedValue({ id: 1 }),
    findAll: jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    }),
    findOne: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    remove: jest.fn().mockResolvedValue({ message: 'ok' }),
  };
  const input = {
    title: 'Fundamental Rights',
    type: 'document',
    fileUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/content/a.pdf',
    subjectId: 1,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [{ provide: ContentService, useValue: service }, RolesGuard],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          const role = req.headers.authorization?.replace('Bearer ', '');
          if (!role) throw new UnauthorizedException();
          req.user = { userId: 42, roles: [role] };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    // Match main.ts, including its implicit conversion setting.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        validateCustomDecorators: true,
      }),
    );
    app.useLogger(false);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => jest.clearAllMocks());

  it.each(['get', 'post'])('rejects unauthenticated %s', async (method) => {
    await request(app.getHttpServer())
      [method]('/content')
      .send(input)
      .expect(401);
  });

  it('lets a student browse the library', async () => {
    await request(app.getHttpServer())
      .get('/content')
      .set('Authorization', 'Bearer user')
      .expect(200);

    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10 }),
      { userId: 42, isStaff: false },
    );
  });

  it.each([
    ['post', '/content'],
    ['patch', '/content/1'],
    ['delete', '/content/1'],
  ])('denies a student %s %s', async (method, path) => {
    await request(app.getHttpServer())
      [method](path)
      .set('Authorization', 'Bearer user')
      .send(input)
      .expect(403);
  });

  it.each(['admin', 'staff'])('lets %s author content', async (role) => {
    await request(app.getHttpServer())
      .post('/content')
      .set('Authorization', `Bearer ${role}`)
      .send(input)
      .expect(201);

    expect(service.create).toHaveBeenCalledWith(input, 42);
  });

  it.each(['admin', 'staff'])(
    'marks %s as staff when reading',
    async (role) => {
      await request(app.getHttpServer())
        .get('/content/1')
        .set('Authorization', `Bearer ${role}`)
        .expect(200);

      expect(service.findOne).toHaveBeenCalledWith(1, {
        userId: 42,
        isStaff: true,
      });
    },
  );

  it('rejects a property the DTO does not declare', async () => {
    await request(app.getHttpServer())
      .post('/content')
      .set('Authorization', 'Bearer admin')
      .send({ ...input, createdBy: 1 })
      .expect(400);
  });

  it('rejects an unknown content type', async () => {
    await request(app.getHttpServer())
      .post('/content')
      .set('Authorization', 'Bearer admin')
      .send({ ...input, type: 'podcast' })
      .expect(400);
  });

  it('accepts an empty batchIds array, meaning every student', async () => {
    await request(app.getHttpServer())
      .patch('/content/1')
      .set('Authorization', 'Bearer admin')
      .send({ batchIds: [] })
      .expect(200);

    expect(service.update).toHaveBeenCalledWith(1, { batchIds: [] }, 42);
  });
});
