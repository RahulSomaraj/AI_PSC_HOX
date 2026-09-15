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
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { HttpExceptionFilter } from '../shared/exception-service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import {
  toOptionalBoolean,
  toOptionalNumber,
} from '../common/utils/query.util';

/**
 * The exam / post catalog. `/exam` (singular) is a different module - it runs
 * a user through a set of questions.
 *
 * Served at both `/exams` and `/exam-posts`. The console asks for the
 * catalogue as `/exam-posts` (the Batches form's exam picker), while `/exams`
 * is what everything here already uses - including `/exams/:id/results` on a
 * separate controller - so both stay. Same handlers, same responses.
 */
@ApiTags('exams')
@UseFilters(new HttpExceptionFilter('Exams'))
@Controller(['exams', 'exam-posts'])
export class ExamPostsController {
  constructor(private readonly examPostsService: ExamPostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create an exam / post (Admin only)',
    description:
      'Create an exam under an exam level. The name must be unique within the level.',
  })
  @ApiBody({
    type: CreateExamPostDto,
    examples: {
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
  })
  @ApiQuery({
    name: 'examLevelId',
    required: false,
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
  }
}
