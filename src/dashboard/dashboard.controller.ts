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
import { DashboardService } from './dashboard.service';
import { RangeQueryDto, daysIn } from './dto/range-query.dto';
import { RecentQuestionsQueryDto } from './dto/recent-questions-query.dto';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { RecentQuestionDto } from './dto/recent-question.dto';
import { DashboardSeriesDto } from './dto/dashboard-series.dto';
import {
  UpcomingExamDto,
  UpcomingExamsQueryDto,
} from './dto/upcoming-exam.dto';

/**
 * Admin dashboard reads.
 *
 * `GET /dashboard` itself lives on AppController and still returns
 * enrollment stats; this controller only adds named sub-routes, so the two
 * do not collide.
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
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Dashboard KPI tiles (Admin only)',
    description:
      'Total students, running batches, active subscriptions and today’s ' +
      'exams in one round trip. The counts are issued in parallel.',
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

  @Get('upcoming-exams')
  @ApiOperation({
    summary: 'Upcoming exams (Admin only)',
    description:
      'Always an empty list for now: nothing in the catalogue carries a date to be upcoming by (decision D1).',
  })
  @ApiResponse({ status: 200, type: [UpcomingExamDto] })
  upcomingExams(
    @Query() query: UpcomingExamsQueryDto,
  ): Promise<UpcomingExamDto[]> {
    return this.dashboardService.upcomingExams(query.limit ?? 5);
  }

  @Get('exam-attempts')
  @ApiOperation({
    summary: 'Exam attempts per day (Admin only)',
    description:
      'Attempts started per day, oldest first and gap-filled. `total` is the ' +
      'sum of the days - every attempt is its own row, so none is counted twice.',
  })
  @ApiResponse({ status: 200, type: DashboardSeriesDto })
  examAttempts(@Query() query: RangeQueryDto): Promise<DashboardSeriesDto> {
    return this.dashboardService.examAttemptsSeries(daysIn(query.range));
  }

  @Get('dau')
  @ApiOperation({
    summary: 'Daily active students (Admin only)',
    description:
      'Distinct students seen per day, oldest first and gap-filled. `total` ' +
      'is distinct students across the whole window, not the sum of the days.',
  })
  @ApiResponse({ status: 200, type: DashboardSeriesDto })
  dau(@Query() query: RangeQueryDto): Promise<DashboardSeriesDto> {
    return this.dashboardService.dailyActiveSeries(daysIn(query.range));
  }
}
