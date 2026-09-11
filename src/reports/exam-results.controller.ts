import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { HttpExceptionFilter } from '../shared/exception-service';
import { ExamResultsService } from './exam-results.service';
import { ExamResultsQueryDto } from './dto/exam-results-query.dto';
import { ExamResultsDto } from './dto/exam-result-row.dto';

/**
 * Results for a catalogue exam, served under /exams beside ExamPostsController.
 *
 * A separate controller on the same base path rather than a route added to
 * exam-posts, for the same reason StudentAnalyticsController sits beside
 * UsersController: the reporting surface is ours and the CRUD is not.
 *
 * `:id` is an exam **post**, consistently with the rest of /exams. Attempts
 * link to a *stage*, so the roster spans that post's stages and `?stageId`
 * narrows it.
 *
 * Note `/exam/:id` (singular) is a student's attempt session and is a
 * different thing entirely - decision D3 proposes renaming it to /attempts.
 */
@ApiTags('reports', 'admin')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@UseFilters(new HttpExceptionFilter('Reports'))
@Controller('exams')
export class ExamResultsController {
  constructor(private readonly examResultsService: ExamResultsService) {}

  @Get(':id/results')
  @ApiOperation({
    summary: 'Get results for a catalogue exam (Admin only)',
    description:
      'Every completed attempt filed against a stage of this exam post, best ' +
      'percentage first. Only attempts that named a stage when they were ' +
      'started appear - see the note in API_CONTRACT.md about attempts that ' +
      'predate the link.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam post ID',
    example: 1,
  })
  @ApiResponse({ status: 200, type: ExamResultsDto })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  results(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ExamResultsQueryDto,
  ): Promise<ExamResultsDto> {
    return this.examResultsService.forExamPost(
      id,
      query.stageId,
      query.page ?? 1,
      query.limit ?? 25,
    );
  }
}
