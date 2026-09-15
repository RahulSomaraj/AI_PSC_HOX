import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ReportsController } from './reports.controller';
import { ReportTabsService } from './report-tabs.service';
import { StudentPerformanceService } from './student-performance.service';
import { ExamAnalyticsService } from './exam-analytics.service';
import { GrowthEngagementService } from './growth-engagement.service';
import { ContentUsageService } from './content-usage.service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('Reports HTTP contract', () => {
  let app: INestApplication;
  const tabs = {
    studentPerformance: jest.fn().mockResolvedValue({ tab: 'performance' }),
    examAnalytics: jest.fn().mockResolvedValue({ tab: 'exams' }),
    contentUsage: jest.fn().mockResolvedValue({ tab: 'content' }),
    engagement: jest.fn().mockResolvedValue({ tab: 'engagement' }),
  };
  const roster = { report: jest.fn().mockResolvedValue({ report: 'roster' }) };
  const courses = {
    report: jest.fn().mockResolvedValue({ report: 'courses' }),
  };
  const growth = { report: jest.fn().mockResolvedValue({ report: 'growth' }) };
  const breakdown = {
    report: jest.fn().mockResolvedValue({ report: 'breakdown' }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportTabsService, useValue: tabs },
        { provide: StudentPerformanceService, useValue: roster },
        { provide: ExamAnalyticsService, useValue: courses },
        { provide: GrowthEngagementService, useValue: growth },
        { provide: ContentUsageService, useValue: breakdown },
        RolesGuard,
      ],
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

  describe("the console's four tabs", () => {
    it.each([
      ['student-performance', 'studentPerformance', 'performance'],
      ['exam-analytics', 'examAnalytics', 'exams'],
      ['content-usage', 'contentUsage', 'content'],
      ['engagement', 'engagement', 'engagement'],
    ])(
      'GET /reports/%s answers from the tab report',
      async (path, method, tab) => {
        const response = await request(app.getHttpServer())
          .get(`/reports/${path}`)
          .set('Authorization', 'Bearer admin')
          .expect(200);

        expect(response.body).toEqual({ tab });
        expect(tabs[method as keyof typeof tabs]).toHaveBeenCalledTimes(1);
      },
    );
  });

  describe('the detailed reports', () => {
    it.each([
      ['student-performance/students', roster, 'roster'],
      ['exam-analytics/courses', courses, 'courses'],
      ['content-usage/breakdown', breakdown, 'breakdown'],
      ['growth-engagement', growth, 'growth'],
    ])('GET /reports/%s still answers', async (path, service, report) => {
      const response = await request(app.getHttpServer())
        .get(`/reports/${path}`)
        .set('Authorization', 'Bearer admin')
        .expect(200);

      expect(response.body).toEqual({ report });
      expect(service.report).toHaveBeenCalledTimes(1);
    });

    it('defaults growth-engagement to 30 days', async () => {
      await request(app.getHttpServer())
        .get('/reports/growth-engagement')
        .set('Authorization', 'Bearer admin')
        .expect(200);

      expect(growth.report).toHaveBeenCalledWith(30);
    });
  });

  it.each([
    'student-performance',
    'exam-analytics',
    'content-usage',
    'engagement',
    'student-performance/students',
    'exam-analytics/courses',
    'content-usage/breakdown',
    'growth-engagement',
  ])('denies GET /reports/%s to everyone but admins', async (path) => {
    for (const role of ['user', 'staff']) {
      await request(app.getHttpServer())
        .get(`/reports/${path}`)
        .set('Authorization', `Bearer ${role}`)
        .expect(403);
    }
    await request(app.getHttpServer()).get(`/reports/${path}`).expect(401);
  });
});
