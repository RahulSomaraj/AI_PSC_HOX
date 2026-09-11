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

/**
 * The Reports screen: one endpoint per tab.
 *
 * Student Performance, Exam Analytics, Content Usage and Growth & Engagement.
 * Content Usage is absent - nothing records who opens a piece of content, so
 * there is nothing to aggregate yet. See API_CONTRACT.md.
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
}
