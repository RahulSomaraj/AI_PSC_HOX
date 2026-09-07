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
import { ExamSyllabiService } from './exam-syllabi.service';
import { CreateExamSyllabusDto } from './dto/create-exam-syllabus.dto';
import { UpdateExamSyllabusDto } from './dto/update-exam-syllabus.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { HttpExceptionFilter } from '../shared/exception-service';

@ApiTags('exam-syllabi')
@UseFilters(new HttpExceptionFilter('exam-syllabi'))
@Controller('exam-syllabi')
export class ExamSyllabiController {
  constructor(private readonly examSyllabiService: ExamSyllabiService) {}

  @Post()
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-syllabi')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create an exam syllabus (Admin only)',
    description:
      'A syllabus covers one stage of one exam post, and holds the items ' +
      'that map it onto the academic taxonomy. A stage may have only one ' +
      'live syllabus, and examPostId must be the post that owns the stage.',
  })
  @ApiBody({
    type: CreateExamSyllabusDto,
    examples: {
      prelims: {
        summary: 'Preliminary syllabus',
        value: {
          examPostId: 1,
          examStageId: 1,
          title: 'LDC Preliminary - Detailed Syllabus 2026',
          description:
            'Covers the full prelims syllabus as published in the 2026 notification.',
        },
      },
      minimal: {
        summary: 'Minimal',
        value: { examPostId: 1, examStageId: 2, title: 'Mains Syllabus' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Exam syllabus created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input, or the stage does not belong to that exam post',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Exam stage not found' })
  @ApiResponse({
    status: 409,
    description: 'This exam stage already has a live syllabus',
  })
  create(
    @Body() createExamSyllabusDto: CreateExamSyllabusDto,
    @GetUser('id') userId: number,
  ) {
    return this.examSyllabiService.create(createExamSyllabusDto, userId);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-syllabi')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List exam syllabi (Admin only)',
    description:
      'Return every live syllabus, newest first. The two filters combine: ' +
      'examStageId identifies at most one syllabus, examPostId returns the ' +
      'syllabi of every stage of that post.',
  })
  @ApiQuery({
    name: 'examPostId',
    required: false,
    type: Number,
    example: 1,
    description:
      'Restrict to one exam post. An unknown post returns an empty list, not 404.',
  })
  @ApiQuery({
    name: 'examStageId',
    required: false,
    type: Number,
    example: 1,
    description:
      'Restrict to one stage. Returns at most one syllabus, as a list.',
  })
  @ApiResponse({ status: 200, description: 'Exam syllabi retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Filter IDs must be integers' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  findAll(
    @Query('examPostId', new ParseIntPipe({ optional: true }))
    examPostId?: number,
    @Query('examStageId', new ParseIntPipe({ optional: true }))
    examStageId?: number,
  ) {
    return this.examSyllabiService.findAll(examPostId, examStageId);
  }

  @Get(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-syllabi')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get exam syllabus by ID (Admin only)' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam syllabus ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Exam syllabus retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Exam syllabus not found' })
  findOne(@Param('id') id: number) {
    return this.examSyllabiService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-syllabi')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update exam syllabus by ID (Admin only)',
    description:
      'All fields are optional. Moving a syllabus to another stage is ' +
      'allowed, but the target stage must be free - an occupied stage is ' +
      'reported as 409 rather than displacing what is there.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam syllabus ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateExamSyllabusDto,
    examples: {
      retitle: {
        summary: 'Retitle',
        value: { title: 'LDC Preliminary - Revised Syllabus 2026' },
      },
      move: {
        summary: 'Move to another stage of the same post',
        value: { examStageId: 2 },
      },
      deactivate: { summary: 'Deactivate', value: { isActive: false } },
    },
  })
  @ApiResponse({ status: 200, description: 'Exam syllabus updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input, or the stage does not belong to that exam post',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({
    status: 404,
    description: 'Exam syllabus not found, or the new stage does not exist',
  })
  @ApiResponse({
    status: 409,
    description: 'The target exam stage already has a live syllabus',
  })
  update(
    @Param('id') id: number,
    @Body() updateExamSyllabusDto: UpdateExamSyllabusDto,
    @GetUser('id') userId: number,
  ) {
    return this.examSyllabiService.update(+id, updateExamSyllabusDto, userId);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-syllabi')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete exam syllabus by ID (Admin only)',
    description:
      'Soft delete. No body is required - the deleter is taken from the ' +
      'token. Refused while the syllabus still holds items: items are ' +
      'hard-deleted, so removing them with the syllabus would destroy them ' +
      'while the syllabus itself stayed restorable. Delete the items first.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam syllabus ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Exam syllabus deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Exam syllabus not found' })
  @ApiResponse({
    status: 409,
    description: 'The syllabus still holds items',
  })
  remove(@Param('id') id: number, @GetUser('id') userId: number) {
    return this.examSyllabiService.remove(+id, userId);
  }
}
