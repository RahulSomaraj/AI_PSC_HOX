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

/**
 * The Reports screen: one endpoint per tab.
 *
 * Student Performance, Exam Analytics, Content Usage and Growth & Engagement,
 * one endpoint each. All four are read-only aggregates over tables another
 * module writes: answer_log, exams, content_view and user_activity.
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
    private readonly studentPerformanceService: StudentPerformanceService,
    private readonly examAnalyticsService: ExamAnalyticsService,
    private readonly growthEngagementService: GrowthEngagementService,
    private readonly contentUsageService: ContentUsageService,
  ) {}

  @Get('student-performance')
  @ApiOperation({
    summary: 'Student Performance tab (Admin only)',
    description:
      'One row per student: exams taken, average exam score, answer ' +
      'accuracy, batch and last activity. Every student appears, including ' +
      'those who have answered nothing - they report null and sort last.',
  })
  @ApiResponse({ status: 200, type: StudentPerformanceDto })
  studentPerformance(
    @Query() query: StudentPerformanceQueryDto,
  ): Promise<StudentPerformanceDto> {
    return this.studentPerformanceService.report(query);
  }

  @Get('exam-analytics')
  @ApiOperation({
    summary: 'Exam Analytics tab (Admin only)',
    description:
      'Attempt volume, completion rate and scoring, grouped by course, ' +
      'with a summary across everything in scope. Grouped by course rather ' +
      'than by catalogue exam - see API_CONTRACT.md for why.',
  })
  @ApiResponse({ status: 200, type: ExamAnalyticsDto })
  examAnalytics(
    @Query() query: ExamAnalyticsQueryDto,
  ): Promise<ExamAnalyticsDto> {
    return this.examAnalyticsService.report(query);
  }

  @Get('growth-engagement')
  @ApiOperation({
    summary: 'Growth & Engagement tab (Admin only)',
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

  @Get('content-usage')
  @ApiOperation({
    summary: 'Content Usage tab (Admin only)',
    description:
      'What students are reading: totals, a daily series, breakdowns by ' +
      'subject and by batch, and the most-opened items. Staff opens are ' +
      'not counted and repeat opens are not deduplicated - both are ' +
      'decided at the write site. Rows exist from 2026-09-12 only.',
  })
  @ApiResponse({ status: 200, type: ContentUsageDto })
  contentUsage(
    @Query() query: ContentUsageQueryDto,
  ): Promise<ContentUsageDto> {
    return this.contentUsageService.report(query);
  }
}
