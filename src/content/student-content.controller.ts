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
import { StudentContentService } from './student-content.service';
import {
  RecentContentDto,
  RecentContentQueryDto,
} from './dto/recent-content.dto';

/**
 * Content panels that hang off a student profile, served under /users.
 *
 * A second controller on the `users` base path rather than a route added to
 * UsersController: both developers need a /users/:id/* route, and that file
 * is the obvious collision, so neither of us touches it (CLAUDE.md §3).
 * Voyager211's mirror of this file is reports/student-analytics.controller.ts.
 *
 * `:id/recent-content` is two segments, so UsersController's `@Get(':id')`
 * cannot swallow it and the registration order of the two does not matter.
 */
@ApiTags('content', 'admin')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@UseFilters(new HttpExceptionFilter('Content'))
@Controller('users')
export class StudentContentController {
  constructor(private readonly studentContentService: StudentContentService) {}

  @Get(':id/recent-content')
  @ApiOperation({
    summary: 'What a student has opened lately',
    description:
      'Backs the Recently Viewed Content panel on the student profile. Newest first.',
  })
  @ApiParam({ name: 'id', description: 'The student user id.' })
  @ApiResponse({ status: 200, type: [RecentContentDto] })
  @ApiResponse({ status: 404, description: 'Student not found' })
  recentContent(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: RecentContentQueryDto,
  ): Promise<RecentContentDto[]> {
    return this.studentContentService.recentContent(id, query.limit ?? 5);
  }
}
