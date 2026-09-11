import { Controller, Get, Query, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { HttpExceptionFilter } from '../shared/exception-service';
import { ActivityService } from '../activity/activity.service';
import { DailyActiveCountDto } from '../activity/dto/daily-active-count.dto';
import { DashboardService } from './dashboard.service';
import { DaysQueryDto } from './dto/days-query.dto';
import { RecentQuestionsQueryDto } from './dto/recent-questions-query.dto';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { RecentQuestionDto } from './dto/recent-question.dto';
import { DailyAttemptCountDto } from './dto/daily-attempt-count.dto';

/**
 * Admin dashboard reads.
 *
 * `GET /dashboard` itself lives on AppController and still returns
 * enrollment stats; this controller only adds named sub-routes, so the two
 * do not collide. `GET /dashboard/upcoming-exams` is deliberately absent -
 * nothing in the catalogue carries a date yet (decision D1 in CLAUDE.md).
 */
@ApiTags('dashboard', 'admin')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@UseFilters(new HttpExceptionFilter('Dashboard'))
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly activityService: ActivityService,
  ) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Dashboard KPI tiles (Admin only)',
    description:
      'Total students, running batches and active subscriptions in one ' +
      'round trip. The three counts are issued in parallel.',
  })
  @ApiResponse({ status: 200, type: DashboardSummaryDto })
  summary(): Promise<DashboardSummaryDto> {
    return this.dashboardService.summary();
  }

  @Get('recent-questions')
  @ApiOperation({
    summary: 'Recently added questions (Admin only)',
    description:
      'The newest non-retired questions, each with the subject it is tagged ' +
      'with. Newest first.',
  })
  @ApiResponse({ status: 200, type: [RecentQuestionDto] })
  recentQuestions(
    @Query() query: RecentQuestionsQueryDto,
  ): Promise<RecentQuestionDto[]> {
    return this.dashboardService.recentQuestions(query.limit ?? 5);
  }

  @Get('exam-attempts')
  @ApiOperation({
    summary: 'Exam attempts per day (Admin only)',
    description:
      'Attempts started per day, oldest first and gap-filled so the chart ' +
      'has a point for every day in the window.',
  })
  @ApiResponse({ status: 200, type: [DailyAttemptCountDto] })
  examAttempts(@Query() query: DaysQueryDto): Promise<DailyAttemptCountDto[]> {
    return this.dashboardService.examAttempts(query.days ?? 7);
  }

  /**
   * Thin pass-through to ActivityService, which owns the presence data.
   * The endpoint belongs to the dashboard; ActivityModule deliberately has
   * no controller of its own.
   */
  @Get('dau')
  @ApiOperation({
    summary: 'Daily active students (Admin only)',
    description:
      'Distinct students seen per day, oldest first and gap-filled, so the ' +
      'chart draws a point for every day in the window.',
  })
  @ApiResponse({ status: 200, type: [DailyActiveCountDto] })
  dau(@Query() query: DaysQueryDto): Promise<DailyActiveCountDto[]> {
    return this.activityService.dailyActiveUsers(query.days ?? 7, Role.User);
  }
}
