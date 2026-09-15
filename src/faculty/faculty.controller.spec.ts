jest.mock('../subjects/entities/subject.entity', () => ({
  Subject: class Subject {},
}));
jest.mock('../batches/entities/batch.entity', () => ({
  Batch: class Batch {},
}));

import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FacultyController } from './faculty.controller';
import { FacultyService } from './faculty.service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('Faculty HTTP contract', () => {
  let app: INestApplication;
  const service = {
    create: jest.fn().mockResolvedValue({ id: 1 }),
    findAll: jest.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    }),
    findOne: jest.fn().mockResolvedValue({ id: 1 }),
    options: jest.fn().mockResolvedValue({ roles: [] }),
    contributions: jest.fn().mockResolvedValue({ facultyId: 1 }),
    update: jest.fn().mockResolvedValue({ id: 1 }),
    setStatus: jest.fn().mockResolvedValue({ id: 1, isActive: false }),
    remove: jest
      .fn()
      .mockResolvedValue({ message: 'Faculty member deleted successfully' }),
  };
  const input = {
    firstName: 'Omari',
    lastName: 'Everett',
    email: 'omari@example.com',
    phone: '9876543210',
    password: 'SecurePass123!',
    subjectId: 1,
    role: 'teacher',
    batchIds: [1, 2],
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [FacultyController],
      providers: [{ provide: FacultyService, useValue: service }, RolesGuard],
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

  it.each(['get', 'post', 'patch', 'delete'])(
    'rejects unauthenticated %s',
    async (method) => {
      const path =
        method === 'get' || method === 'post' ? '/faculty' : '/faculty/1';
      await request(app.getHttpServer())[method](path).send(input).expect(401);
    },
  );

  it.each(['user', 'staff'])(
    'denies the %s account role on every route',
    async (role) => {
      for (const [method, path] of [
        ['get', '/faculty'],
        ['get', '/faculty/options'],
        ['get', '/faculty/1'],
        ['get', '/faculty/1/contributions'],
        ['post', '/faculty'],
        ['patch', '/faculty/1'],
        ['patch', '/faculty/1/status'],
        ['delete', '/faculty/1'],
      ]) {
        await request(app.getHttpServer())
          [method](path)
          .set('Authorization', `Bearer ${role}`)
          .send(input)
          .expect(403);
      }
    },
  );

  it('accepts a valid create and takes the audit actor from authentication', async () => {
    await request(app.getHttpServer())
      .post('/faculty')
      .set('Authorization', 'Bearer admin')
      .send(input)
      .expect(201);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining(input),
      7,
    );
  });

  it('validates query filters and correctly parses the string false', async () => {
    await request(app.getHttpServer())
      .get('/faculty?isActive=false&page=2&limit=10&subjectId=1&role=reviewer')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: false,
        page: 2,
        limit: 10,
        subjectId: 1,
        role: 'reviewer',
      }),
    );
  });

  it.each([
    'page=0',
    'limit=101',
    'subjectId=nope',
    'batchId=-1',
    'role=admin',
    'isActive=garbage',
  ])('rejects invalid query %s', async (query) => {
    await request(app.getHttpServer())
      .get(`/faculty?${query}`)
      .set('Authorization', 'Bearer admin')
      .expect(400);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it.each([
    { firstName: '   ' },
    { email: 'invalid' },
    { password: 'weak' },
    { subjectId: null },
    { role: 'admin' },
    { batchIds: [1, 1] },
    { batchIds: [0] },
    { batchIds: ['1'] },
    { batchIds: null },
    { isActive: 'false' },
    { isActive: null },
    { createdBy: 99 },
  ])('rejects invalid create fields %j', async (fields) => {
    await request(app.getHttpServer())
      .post('/faculty')
      .set('Authorization', 'Bearer admin')
      .send({ ...input, ...fields })
      .expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('routes contributions past the numeric ID route', async () => {
    await request(app.getHttpServer())
      .get('/faculty/7/contributions')
      .set('Authorization', 'Bearer admin')
      .expect(200);

    expect(service.contributions).toHaveBeenCalledWith(7, 5);
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it('passes the recent-items limit the console sends', async () => {
    await request(app.getHttpServer())
      .get('/faculty/7/contributions?limit=10')
      .set('Authorization', 'Bearer admin')
      .expect(200);

    expect(service.contributions).toHaveBeenCalledWith(7, 10);
  });

  it.each(['0', '51', 'many'])(
    'rejects a contributions limit of %s',
    async (limit) => {
      await request(app.getHttpServer())
        .get(`/faculty/7/contributions?limit=${limit}`)
        .set('Authorization', 'Bearer admin')
        .expect(400);

      expect(service.contributions).not.toHaveBeenCalled();
    },
  );

  it('routes options before the numeric ID route', async () => {
    await request(app.getHttpServer())
      .get('/faculty/options')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(service.options).toHaveBeenCalledTimes(1);
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it('supports detail, partial edit, status and delete', async () => {
    const server = app.getHttpServer();
    await request(server)
      .get('/faculty/1')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    await request(server)
      .patch('/faculty/1')
      .set('Authorization', 'Bearer admin')
      .send({ batchIds: [], role: 'content_creator' })
      .expect(200);
    await request(server)
      .patch('/faculty/1/status')
      .set('Authorization', 'Bearer admin')
      .send({ isActive: false })
      .expect(200);
    await request(server)
      .delete('/faculty/1')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(service.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ batchIds: [], role: 'content_creator' }),
      7,
    );
    expect(service.setStatus).toHaveBeenCalledWith(1, false, 7);
    expect(service.remove).toHaveBeenCalledWith(1, 7);
  });

  it.each([
    { role: null },
    { subjectId: null },
    { firstName: null },
    { password: 'SecurePass123!' },
    { userId: 20 },
  ])('rejects invalid or protected update fields %j', async (body) => {
    await request(app.getHttpServer())
      .patch('/faculty/1')
      .set('Authorization', 'Bearer admin')
      .send(body)
      .expect(400);
    expect(service.update).not.toHaveBeenCalled();
  });

  it.each([{ isActive: 'false' }, { isActive: null }, {}])(
    'rejects invalid status bodies %j',
    async (body) => {
      await request(app.getHttpServer())
        .patch('/faculty/1/status')
        .set('Authorization', 'Bearer admin')
        .send(body)
        .expect(400);
    },
  );

  it('rejects a non-numeric record ID', async () => {
    await request(app.getHttpServer())
      .get('/faculty/abc')
      .set('Authorization', 'Bearer admin')
      .expect(400);
  });
});
