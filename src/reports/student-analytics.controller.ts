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
import { StudentAnalyticsService } from './student-analytics.service';
import { WeakSubjectsQueryDto } from './dto/weak-subjects-query.dto';
import { WeakSubjectDto } from './dto/weak-subject.dto';

/**
 * Analytics panels that hang off a student profile, served under /users.
 *
 * A second controller on the `users` base path rather than a route added to
 * UsersController: both developers need a /users/:id/* route, and that file
 * is the obvious collision, so neither of us touches it (CLAUDE.md §3).
 * Anaswar4's mirror of this file is content/student-content.controller.ts.
 *
 * `:id/weak-subjects` is two segments, so UsersController's `@Get(':id')`
 * cannot swallow it and the registration order of the two does not matter.
 */
@ApiTags('reports', 'admin')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@UseFilters(new HttpExceptionFilter('Reports'))
@Controller('users')
export class StudentAnalyticsController {
  constructor(
    private readonly studentAnalyticsService: StudentAnalyticsService,
  ) {}

  @Get(':id/weak-subjects')
  @ApiOperation({
    summary: "Get a student's weakest subjects (Admin only)",
    description:
      'Backs the Weak Subjects panel on the student profile. Rolls up every ' +
      'answer the student has given, practice and exam alike, by subject, ' +
      'and returns the lowest accuracy first. As with GET /users/:id, only ' +
      'accounts with the "user" role are returned - an admin ID reports 404.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'User ID', example: 1 })
  @ApiResponse({ status: 200, type: [WeakSubjectDto] })
  @ApiResponse({ status: 404, description: 'Student not found' })
  weakSubjects(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: WeakSubjectsQueryDto,
  ): Promise<WeakSubjectDto[]> {
    return this.studentAnalyticsService.weakSubjects(
      id,
      query.limit ?? 5,
      query.minAttempts ?? 5,
    );
  }
}
