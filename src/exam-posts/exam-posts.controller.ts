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
<<<<<<< HEAD
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { HttpExceptionFilter } from '../shared/exception-service';
=======
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
<<<<<<< HEAD
import {
  toOptionalBoolean,
  toOptionalNumber,
} from '../common/utils/query.util';

/**
 * The exam / post catalog. `/exam` (singular) is a different module - it runs
 * a user through a set of questions.
 */
@ApiTags('exams')
@UseFilters(new HttpExceptionFilter('Exams'))
@Controller('exams')
=======
import { HttpExceptionFilter } from '../shared/exception-service';

@ApiTags('exam-posts')
@UseFilters(new HttpExceptionFilter('exam-posts'))
@Controller('exam-posts')
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
export class ExamPostsController {
  constructor(private readonly examPostsService: ExamPostsService) {}

  @Post()
<<<<<<< HEAD
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create an exam / post (Admin only)',
    description:
      'Create an exam under an exam level. The name must be unique within the level.',
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  })
  @ApiBody({
    type: CreateExamPostDto,
    examples: {
<<<<<<< HEAD
      example1: {
        summary: 'Sub Inspector of Police',
        value: {
          examLevelId: 1,
          name: 'Sub Inspector of Police',
          shortName: 'SI',
          department: 'Kerala Police',
          qualification: 'Any degree from a recognised university',
          sortOrder: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Exam created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Exam level not found' })
  @ApiResponse({
    status: 409,
    description: 'Exam already exists for that level',
  })
  async create(
    @Body() createExamPostDto: CreateExamPostDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.examPostsService.create(createExamPostDto, actorId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List exams / posts',
    description: 'Optionally filtered by exam level, status or name.',
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  })
  @ApiQuery({
    name: 'examLevelId',
    required: false,
<<<<<<< HEAD
    type: 'number',
    description: 'Only exams under this level',
  })
  @ApiQuery({ name: 'isActive', required: false, type: 'boolean' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: 'string',
    description: 'Case-insensitive match on the exam name',
  })
  @ApiResponse({ status: 200, description: 'Exams retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('examLevelId') examLevelId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return await this.examPostsService.findAll({
      examLevelId: toOptionalNumber(examLevelId, 'examLevelId'),
      isActive: toOptionalBoolean(isActive, 'isActive'),
      search,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get an exam by ID',
    description: 'Includes the exam level and the stages of the exam.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Exam ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Exam retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.examPostsService.findOneWithStages(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Activate or deactivate an exam (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Exam ID', example: 1 })
  @ApiBody({
    type: UpdateStatusDto,
    examples: {
      example1: { summary: 'Deactivate', value: { isActive: false } },
    },
  })
  @ApiResponse({ status: 200, description: 'Exam status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.examPostsService.setStatus(
      id,
      updateStatusDto.isActive,
      actorId,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update an exam (Admin only)',
    description: 'All fields are optional.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Exam ID', example: 1 })
  @ApiBody({
    type: UpdateExamPostDto,
    examples: {
      example1: {
        summary: 'Update the department',
        value: { department: 'Kerala Police - Armed Battalion' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Exam updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Exam or exam level not found' })
  @ApiResponse({ status: 409, description: 'Another exam uses that name' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateExamPostDto: UpdateExamPostDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.examPostsService.update(id, updateExamPostDto, actorId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete an exam (Admin only)',
    description: 'Soft delete. Refused while the exam still has stages.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Exam ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Exam deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiResponse({ status: 409, description: 'Exam still has stages' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') actorId: number,
  ) {
    return await this.examPostsService.remove(id, actorId);
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  }
}
