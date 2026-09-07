import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExamPostsService } from './exam-posts.service';
import { CreateExamPostDto } from './dto/create-exam-post.dto';
import { UpdateExamPostDto } from './dto/update-exam-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { HttpExceptionFilter } from '../shared/exception-service';

@ApiTags('exam-posts')
@UseFilters(new HttpExceptionFilter('exam-posts'))
@Controller('exam-posts')
export class ExamPostsController {
  constructor(private readonly examPostsService: ExamPostsService) {}

  @Post()
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-posts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create an exam post (Admin only)',
    description:
      'A post is the catalog entry for an exam - the exam as a thing that ' +
      'exists before anyone sits it. Distinct from an `exams` row, which is ' +
      'one candidate\'s attempt session.',
  })
  @ApiBody({
    type: CreateExamPostDto,
    examples: {
      ldc: {
        summary: 'Lower Division Clerk',
        value: {
          examLevelId: 1,
          name: 'Lower Division Clerk',
          shortName: 'LDC',
          department: 'Revenue',
          qualification: 'A pass in SSLC or equivalent.',
          sortOrder: 1,
        },
      },
      minimal: {
        summary: 'Minimal',
        value: { examLevelId: 1, name: 'Sub Inspector of Police' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Exam post created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Exam level not found' })
  @ApiResponse({
    status: 409,
    description: 'An exam post with this name already exists in this level',
  })
  create(
    @Body() createExamPostDto: CreateExamPostDto,
    @GetUser('id') userId: number,
  ) {
    return this.examPostsService.create(createExamPostDto, userId);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-posts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List exam posts (Admin only)',
    description:
      'Return every live exam post, ordered by sortOrder ascending then ' +
      'name. Pass examLevelId to list the posts of one level.',
  })
  @ApiQuery({
    name: 'examLevelId',
    required: false,
    type: Number,
    example: 1,
    description:
      'Restrict to one level. An unknown level returns an empty list, not 404.',
  })
  @ApiResponse({ status: 200, description: 'Exam posts retrieved successfully' })
  @ApiResponse({ status: 400, description: 'examLevelId must be an integer' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  findAll(
    @Query('examLevelId', new ParseIntPipe({ optional: true }))
    examLevelId?: number,
  ) {
    return this.examPostsService.findAll(examLevelId);
  }

  @Get(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-posts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get exam post by ID (Admin only)' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam post ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Exam post retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Exam post not found' })
  findOne(@Param('id') id: number) {
    return this.examPostsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-posts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update exam post by ID (Admin only)',
    description:
      'All fields are optional, examLevelId included - a post filed under ' +
      'the wrong level can be moved.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam post ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateExamPostDto,
    examples: {
      rename: { summary: 'Rename', value: { name: 'Lower Division Clerk (LDC)' } },
      reparent: {
        summary: 'Move to another level',
        value: { examLevelId: 2 },
      },
      details: {
        summary: 'Fill in catalog details',
        value: { shortName: 'LDC', department: 'Revenue' },
      },
      deactivate: { summary: 'Deactivate', value: { isActive: false } },
    },
  })
  @ApiResponse({ status: 200, description: 'Exam post updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({
    status: 404,
    description: 'Exam post not found, or the new exam level does not exist',
  })
  @ApiResponse({
    status: 409,
    description: 'An exam post with this name already exists in this level',
  })
  update(
    @Param('id') id: number,
    @Body() updateExamPostDto: UpdateExamPostDto,
    @GetUser('id') userId: number,
  ) {
    return this.examPostsService.update(+id, updateExamPostDto, userId);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-posts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete exam post by ID (Admin only)',
    description:
      'Soft delete. No body is required - the deleter is taken from the ' +
      'token. Refused while live exam stages are still defined for the post; ' +
      'delete those first.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam post ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Exam post deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Exam post not found' })
  @ApiResponse({
    status: 409,
    description: 'Exam stages are still defined for this post',
  })
  remove(@Param('id') id: number, @GetUser('id') userId: number) {
    return this.examPostsService.remove(+id, userId);
  }
}
