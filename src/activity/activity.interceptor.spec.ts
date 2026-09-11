import { CanActivate, Controller, ExecutionContext, Get, INestApplication, Injectable, Module, UseGuards } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ActivityInterceptor } from './activity.interceptor';
import { ActivityService } from './activity.service';

// Stands in for JwtAuthGuard: populates request.user exactly as it does.
@Injectable()
class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = { userId: 99 };
    return true;
  }
}

@Controller()
class PingController {
  @Get('ping')
  @UseGuards(FakeAuthGuard)
  ping() { return { ok: true }; }

  @Get('anon')
  anon() { return { ok: true }; }
}

const recorded: number[] = [];

@Module({
  controllers: [PingController],
  providers: [
    { provide: ActivityService, useValue: { recordActivity: (id: number) => recorded.push(id) } },
    { provide: APP_INTERCEPTOR, useClass: ActivityInterceptor },
  ],
})
class TestAppModule {}

describe('ActivityInterceptor ordering', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = (await Test.createTestingModule({ imports: [TestAppModule] }).compile()).createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app.close(); });
  beforeEach(() => { recorded.length = 0; });

  it('sees request.user, proving guards run before interceptors', async () => {
    await request(app.getHttpServer()).get('/ping').expect(200);
    expect(recorded).toEqual([99]);
  });

  it('records nothing for an unauthenticated request', async () => {
    await request(app.getHttpServer()).get('/anon').expect(200);
    expect(recorded).toEqual([]);
  });
});
