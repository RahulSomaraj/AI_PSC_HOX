import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('Dashboard HTTP contract', () => {
  let app: INestApplication;
  const service = {
    summary: jest.fn().mockResolvedValue({}),
    recentQuestions: jest.fn().mockResolvedValue([]),
    upcomingExams: jest.fn().mockResolvedValue([]),
    examAttemptsSeries: jest.fn().mockResolvedValue({ total: 0, points: [] }),
    dailyActiveSeries: jest.fn().mockResolvedValue({ total: 0, points: [] }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: service }, RolesGuard],
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
      }),
    );
    app.useLogger(false);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => jest.clearAllMocks());

  describe('GET /dashboard/upcoming-exams', () => {
    it('exists, and answers with an empty list rather than a 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/upcoming-exams?limit=5')
        .set('Authorization', 'Bearer admin')
        .expect(200);

      expect(response.body).toEqual([]);
      expect(service.upcomingExams).toHaveBeenCalledWith(5);
    });

    it('defaults the limit to 5', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/upcoming-exams')
        .set('Authorization', 'Bearer admin')
        .expect(200);

      expect(service.upcomingExams).toHaveBeenCalledWith(5);
    });

    it.each(['0', '51', 'soon'])('rejects a limit of %s', async (limit) => {
      await request(app.getHttpServer())
        .get(`/dashboard/upcoming-exams?limit=${limit}`)
        .set('Authorization', 'Bearer admin')
        .expect(400);
    });

    it.each(['user', 'staff'])('denies the %s account role', async (role) => {
      await request(app.getHttpServer())
        .get('/dashboard/upcoming-exams')
        .set('Authorization', `Bearer ${role}`)
        .expect(403);
    });
  });

  it('still routes the charts with range', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/dau?range=7d')
      .set('Authorization', 'Bearer admin')
      .expect(200);

    expect(service.dailyActiveSeries).toHaveBeenCalledWith(7);
  });
});
