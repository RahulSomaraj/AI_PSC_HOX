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
import { ExamStagesService } from './exam-stages.service';
import { CreateExamStageDto } from './dto/create-exam-stage.dto';
import { UpdateExamStageDto } from './dto/update-exam-stage.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { HttpExceptionFilter } from '../shared/exception-service';

@ApiTags('exam-stages')
@UseFilters(new HttpExceptionFilter('exam-stages'))
@Controller('exam-stages')
export class ExamStagesController {
  constructor(private readonly examStagesService: ExamStagesService) {}

  @Post()
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-stages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create an exam stage (Admin only)',
    description:
      'A stage is one sitting within an exam post - Preliminary, Mains, ' +
      'Physical Efficiency Test, Interview. Stages are data, not code: a ' +
      'post may have as many as it needs, in any order.',
  })
  @ApiBody({
    type: CreateExamStageDto,
    examples: {
      preliminary: {
        summary: 'Objective preliminary',
        value: {
          examPostId: 1,
          name: 'Preliminary',
          stageOrder: 1,
          examMode: 'objective',
          totalQuestions: 100,
          totalMarks: 100,
          durationMinutes: 75,
          negativeMark: 0.33,
        },
      },
      interview: {
        summary: 'Interview, no marking scheme',
        value: {
          examPostId: 1,
          name: 'Interview',
          stageOrder: 3,
          examMode: 'interview',
          totalMarks: 20,
        },
      },
      minimal: {
        summary: 'Minimal',
        value: { examPostId: 1, name: 'Mains' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Exam stage created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Exam post not found' })
  @ApiResponse({
    status: 409,
    description: 'An exam stage with this name already exists for this post',
  })
  create(
    @Body() createExamStageDto: CreateExamStageDto,
    @GetUser('id') userId: number,
  ) {
    return this.examStagesService.create(createExamStageDto, userId);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-stages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List exam stages (Admin only)',
    description:
      'Return every live exam stage, ordered by stageOrder ascending then ' +
      'name. Pass examPostId to list the stages of one post in sitting order.',
  })
  @ApiQuery({
    name: 'examPostId',
    required: false,
    type: Number,
    example: 1,
    description:
      'Restrict to one post. An unknown post returns an empty list, not 404.',
  })
  @ApiResponse({
    status: 200,
    description: 'Exam stages retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'examPostId must be an integer' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  findAll(
    @Query('examPostId', new ParseIntPipe({ optional: true }))
    examPostId?: number,
  ) {
    return this.examStagesService.findAll(examPostId);
  }

  @Get(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-stages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get exam stage by ID (Admin only)' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam stage ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Exam stage retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Exam stage not found' })
  findOne(@Param('id') id: number) {
    return this.examStagesService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-stages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update exam stage by ID (Admin only)',
    description:
      'All fields are optional, examPostId included - a stage created ' +
      'against the wrong post can be moved. Reordering is a PATCH of ' +
      'stageOrder; two stages of a post may share an order while a sequence ' +
      'is being rearranged.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam stage ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateExamStageDto,
    examples: {
      reorder: { summary: 'Move later in the sequence', value: { stageOrder: 2 } },
      marking: {
        summary: 'Set the marking scheme',
        value: { totalMarks: 100, negativeMark: 0.33 },
      },
      clearNegative: {
        summary: 'Remove negative marking',
        value: { negativeMark: 0 },
      },
      reparent: { summary: 'Move to another post', value: { examPostId: 2 } },
    },
  })
  @ApiResponse({ status: 200, description: 'Exam stage updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({
    status: 404,
    description: 'Exam stage not found, or the new exam post does not exist',
  })
  @ApiResponse({
    status: 409,
    description: 'An exam stage with this name already exists for this post',
  })
  update(
    @Param('id') id: number,
    @Body() updateExamStageDto: UpdateExamStageDto,
    @GetUser('id') userId: number,
  ) {
    return this.examStagesService.update(+id, updateExamStageDto, userId);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-stages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete exam stage by ID (Admin only)',
    description:
      'Soft delete. No body is required - the deleter is taken from the ' +
      'token. Refused while a syllabus is still attached to the stage; ' +
      'delete that first.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam stage ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Exam stage deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Exam stage not found' })
  @ApiResponse({
    status: 409,
    description: 'A syllabus is still attached to this stage',
  })
  remove(@Param('id') id: number, @GetUser('id') userId: number) {
    return this.examStagesService.remove(+id, userId);
  }
}
