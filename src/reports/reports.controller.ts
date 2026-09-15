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
import { StudentPerformanceService } from './student-performance.service';
import { StudentPerformanceQueryDto } from './dto/student-performance-query.dto';
import { StudentPerformanceDto } from './dto/student-performance.dto';
import { ExamAnalyticsService } from './exam-analytics.service';
import { ExamAnalyticsQueryDto } from './dto/exam-analytics-query.dto';
import { ExamAnalyticsDto } from './dto/exam-analytics.dto';
import { GrowthEngagementService } from './growth-engagement.service';
import { GrowthEngagementDto } from './dto/growth-engagement.dto';
import { GrowthQueryDto } from './dto/growth-query.dto';
import { ContentUsageService } from './content-usage.service';
import { ContentUsageQueryDto } from './dto/content-usage-query.dto';
import { ContentUsageDto } from './dto/content-usage.dto';
import { ReportTabsService } from './report-tabs.service';
import {
  ContentUsageTabDto,
  EngagementTabDto,
  ExamAnalyticsTabDto,
  StudentPerformanceTabDto,
} from './dto/report-tabs.dto';

/**
 * The Reports screen.
 *
 * Two layers. The four tab routes - student-performance, exam-analytics,
 * content-usage and engagement - answer in the shapes the console's Reports
 * tabs were built against (BACKEND_ISSUES.md P2-4): one whole, pre-aggregated
 * report per tab.
 *
 * The detailed reports that were first built at three of those paths - a
 * per-student roster, analytics per course, and content usage by day, subject
 * and batch - answer the same questions at a finer grain, and are kept at
 * sub-routes rather than removed. `growth-engagement` is unchanged.
 */
@ApiTags('reports', 'admin')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@UseFilters(new HttpExceptionFilter('Reports'))
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportTabsService: ReportTabsService,
    private readonly studentPerformanceService: StudentPerformanceService,
    private readonly examAnalyticsService: ExamAnalyticsService,
    private readonly growthEngagementService: GrowthEngagementService,
    private readonly contentUsageService: ContentUsageService,
  ) {}

  // ── The console's four tabs ──────────────────────────────────────────────

  @Get('student-performance')
  @ApiOperation({
    summary: 'Student Performance tab (Admin only)',
    description:
      'Active students, average exam score, attempts and sign-ups, with accuracy per subject, batch progress and sign-ups per day.',
  })
  @ApiResponse({ status: 200, type: StudentPerformanceTabDto })
  studentPerformance(): Promise<StudentPerformanceTabDto> {
    return this.reportTabsService.studentPerformance();
  }

  @Get('exam-analytics')
  @ApiOperation({
    summary: 'Exam Analytics tab (Admin only)',
    description:
      'Scores and participation per catalogue exam, with totals across them.',
  })
  @ApiResponse({ status: 200, type: ExamAnalyticsTabDto })
  examAnalytics(): Promise<ExamAnalyticsTabDto> {
    return this.reportTabsService.examAnalytics();
  }

  @Get('content-usage')
  @ApiOperation({
    summary: 'Content Usage tab (Admin only)',
    description:
      'Opens per library item, most opened first, with totals. Completion is not recorded and reports 0.',
  })
  @ApiResponse({ status: 200, type: ContentUsageTabDto })
  contentUsage(): Promise<ContentUsageTabDto> {
    return this.reportTabsService.contentUsage();
  }

  @Get('engagement')
  @ApiOperation({
    summary: 'Growth & Engagement tab - Top Engaged Students (Admin only)',
    description:
      'The 50 students active on the most days in the last 30, most engaged first.',
  })
  @ApiResponse({ status: 200, type: EngagementTabDto })
  engagement(): Promise<EngagementTabDto> {
    return this.reportTabsService.engagement();
  }

  // ── Detailed reports ─────────────────────────────────────────────────────

  @Get('student-performance/students')
  @ApiOperation({
    summary: 'Student roster with performance (Admin only)',
    description:
      'One row per student: exams taken, average exam score, answer ' +
      'accuracy, batch and last activity. Every student appears, including ' +
      'those who have answered nothing - they report null and sort last.',
  })
  @ApiResponse({ status: 200, type: StudentPerformanceDto })
  studentRoster(
    @Query() query: StudentPerformanceQueryDto,
  ): Promise<StudentPerformanceDto> {
    return this.studentPerformanceService.report(query);
  }

  @Get('exam-analytics/courses')
  @ApiOperation({
    summary: 'Exam analytics by course (Admin only)',
    description:
      'Attempt volume, completion rate and scoring, grouped by course, ' +
      'with a summary across everything in scope.',
  })
  @ApiResponse({ status: 200, type: ExamAnalyticsDto })
  examAnalyticsByCourse(
    @Query() query: ExamAnalyticsQueryDto,
  ): Promise<ExamAnalyticsDto> {
    return this.examAnalyticsService.report(query);
  }

  @Get('content-usage/breakdown')
  @ApiOperation({
    summary: 'Content usage by day, subject and batch (Admin only)',
    description:
      'What students are reading: totals, a daily series, breakdowns by ' +
      'subject and by batch, and the most-opened items. Staff opens are ' +
      'not counted and repeat opens are not deduplicated - both are ' +
      'decided at the write site. Rows exist from 2026-09-12 only.',
  })
  @ApiResponse({ status: 200, type: ContentUsageDto })
  contentUsageBreakdown(
    @Query() query: ContentUsageQueryDto,
  ): Promise<ContentUsageDto> {
    return this.contentUsageService.report(query);
  }

  @Get('growth-engagement')
  @ApiOperation({
    summary: 'Growth & engagement over time (Admin only)',
    description:
      'Signups, active students, new subscriptions and exam attempts per ' +
      'day, gap-filled and oldest first, with totals and a returning rate ' +
      'across the window. Active-user figures only cover the period since ' +
      'presence tracking shipped.',
  })
  @ApiResponse({ status: 200, type: GrowthEngagementDto })
  growthEngagement(
    @Query() query: GrowthQueryDto,
  ): Promise<GrowthEngagementDto> {
    return this.growthEngagementService.report(query.days ?? 30);
  }
}
