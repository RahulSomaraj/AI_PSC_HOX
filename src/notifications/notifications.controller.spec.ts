jest.mock('../batches/entities/batch.entity', () => ({
  Batch: class Batch {},
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
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('Notifications HTTP contract', () => {
  let app: INestApplication;
  const service = {
    create: jest.fn().mockResolvedValue({ id: 1 }),
    findAllSent: jest.fn().mockResolvedValue([]),
    findForUser: jest.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    }),
  };
  /** Exactly what the console's composer sends. */
  const composed = {
    title: 'Class moved',
    language: 'en',
    message: 'Friday, 4 PM',
    target: 'All Students',
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: service },
        RolesGuard,
      ],
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

  it.each([
    ['get', '/notifications'],
    ['get', '/notifications/mine'],
    ['post', '/notifications'],
  ])('rejects unauthenticated %s %s', async (method, path) => {
    await request(app.getHttpServer())[method](path).send(composed).expect(401);
  });

  describe('the admin list, GET /notifications', () => {
    it('lets an admin read every notification sent', async () => {
      await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', 'Bearer admin')
        .expect(200);

      expect(service.findAllSent).toHaveBeenCalled();
    });

    it.each(['user', 'staff'])('denies the %s account role', async (role) => {
      await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${role}`)
        .expect(403);

      expect(service.findAllSent).not.toHaveBeenCalled();
    });
  });

  // The reason the controller carries no class-level @Roles: RolesGuard
  // falls back to class metadata, so one there would 403 every student
  // reading their own bell.
  describe('the inbox, GET /notifications/mine', () => {
    it.each(['user', 'staff'])(
      'lets the %s account role read',
      async (role) => {
        await request(app.getHttpServer())
          .get('/notifications/mine')
          .set('Authorization', `Bearer ${role}`)
          .expect(200);

        expect(service.findForUser).toHaveBeenCalledWith(42, {
          page: 1,
          limit: 10,
        });
      },
    );
  });

  describe('POST /notifications', () => {
    it.each(['user', 'staff'])(
      'denies the %s account role a send',
      async (role) => {
        await request(app.getHttpServer())
          .post('/notifications')
          .set('Authorization', `Bearer ${role}`)
          .send(composed)
          .expect(403);

        expect(service.create).not.toHaveBeenCalled();
      },
    );

    it('accepts what the composer sends, stamping the author from the token', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', 'Bearer admin')
        .send(composed)
        .expect(201);

      expect(service.create).toHaveBeenCalledWith(composed, 42);
    });

    it('rejects the old body field', async () => {
      const { message: _message, ...rest } = composed;

      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', 'Bearer admin')
        .send({ ...rest, body: 'Friday, 4 PM' })
        .expect(400);
    });

    it('rejects a property the DTO does not declare', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', 'Bearer admin')
        .send({ ...composed, createdBy: 1 })
        .expect(400);
    });

    it('rejects a title over the column length', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', 'Bearer admin')
        .send({ ...composed, title: 'x'.repeat(201) })
        .expect(400);
    });
  });
});
