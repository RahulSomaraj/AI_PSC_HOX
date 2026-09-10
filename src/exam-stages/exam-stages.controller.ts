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
<<<<<<< HEAD
import { ReorderExamStagesDto } from './dto/reorder-exam-stages.dto';
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

@ApiTags('exam-stages')
@UseFilters(new HttpExceptionFilter('ExamStages'))
=======
import { HttpExceptionFilter } from '../shared/exception-service';

@ApiTags('exam-stages')
@UseFilters(new HttpExceptionFilter('exam-stages'))
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
@Controller('exam-stages')
export class ExamStagesController {
  constructor(private readonly examStagesService: ExamStagesService) {}

  @Post()
<<<<<<< HEAD
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
=======
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-stages')
  @UseGuards(JwtAuthGuard, RolesGuard)
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create an exam stage (Admin only)',
    description:
<<<<<<< HEAD
      'Stages are data, not code - an exam can have any number of them. When stageOrder is omitted the stage is appended after the existing ones.',
=======
      'A stage is one sitting within an exam post - Preliminary, Mains, ' +
      'Physical Efficiency Test, Interview. Stages are data, not code: a ' +
      'post may have as many as it needs, in any order.',
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  })
  @ApiBody({
    type: CreateExamStageDto,
    examples: {
<<<<<<< HEAD
      example1: {
        summary: 'Preliminary examination',
        value: {
          examId: 1,
          name: 'Preliminary Examination',
=======
      preliminary: {
        summary: 'Objective preliminary',
        value: {
          examPostId: 1,
          name: 'Preliminary',
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
          stageOrder: 1,
          examMode: 'objective',
          totalQuestions: 100,
          totalMarks: 100,
          durationMinutes: 75,
          negativeMark: 0.33,
        },
      },
<<<<<<< HEAD
      example2: {
        summary: 'Physical efficiency test',
        value: {
          examId: 1,
          name: 'Physical Efficiency Test',
          stageOrder: 3,
          examMode: 'physical',
        },
      },
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
    },
  })
  @ApiResponse({ status: 201, description: 'Exam stage created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
<<<<<<< HEAD
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiResponse({
    status: 409,
    description: 'Stage already exists for that exam',
  })
  async create(
    @Body() createExamStageDto: CreateExamStageDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.examStagesService.create(createExamStageDto, actorId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List exam stages',
    description:
      'Ordered by stageOrder. Pass examId to list the stages of one exam.',
  })
  @ApiQuery({ name: 'examId', required: false, type: 'number' })
  @ApiQuery({ name: 'isActive', required: false, type: 'boolean' })
  @ApiQuery({ name: 'search', required: false, type: 'string' })
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  @ApiResponse({
    status: 200,
    description: 'Exam stages retrieved successfully',
  })
<<<<<<< HEAD
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('examId') examId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return await this.examStagesService.findAll({
      examId: toOptionalNumber(examId, 'examId'),
      isActive: toOptionalBoolean(isActive, 'isActive'),
      search,
    });
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reorder the stages of an exam (Admin only)',
    description:
      'Applies the whole new ordering in one transaction. Every stage listed must belong to the given exam.',
  })
  @ApiBody({
    type: ReorderExamStagesDto,
    examples: {
      example1: {
        summary: 'Swap the first two stages',
        value: {
          examId: 1,
          items: [
            { id: 2, stageOrder: 1 },
            { id: 1, stageOrder: 2 },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Stages reordered successfully' })
  @ApiResponse({
    status: 400,
    description: 'A stage does not belong to the exam, or an ID is repeated',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async reorder(
    @Body() reorderDto: ReorderExamStagesDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.examStagesService.reorder(reorderDto, actorId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get an exam stage by ID' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam stage ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Exam stage retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Exam stage not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.examStagesService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Activate or deactivate an exam stage (Admin only)',
  })
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam stage ID',
    example: 1,
  })
<<<<<<< HEAD
  @ApiBody({
    type: UpdateStatusDto,
    examples: {
      example1: { summary: 'Deactivate', value: { isActive: false } },
    },
  })
  @ApiResponse({ status: 200, description: 'Exam stage status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Exam stage not found' })
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.examStagesService.setStatus(
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
    summary: 'Update an exam stage (Admin only)',
    description:
      'All fields are optional. A stage cannot be moved to another exam - its syllabus is tied to it.',
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
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
<<<<<<< HEAD
      example1: {
        summary: 'Change the paper pattern',
        value: { totalQuestions: 120, totalMarks: 120, durationMinutes: 90 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Exam stage updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Exam stage not found' })
  @ApiResponse({
    status: 409,
    description: 'Another stage of the exam uses that name',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateExamStageDto: UpdateExamStageDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.examStagesService.update(id, updateExamStageDto, actorId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete an exam stage (Admin only)',
    description:
      'Soft delete. Refused while a syllabus is attached to the stage.',
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam stage ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Exam stage deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
<<<<<<< HEAD
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Exam stage not found' })
  @ApiResponse({ status: 409, description: 'Stage still has a syllabus' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') actorId: number,
  ) {
    return await this.examStagesService.remove(id, actorId);
=======
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Exam stage not found' })
  @ApiResponse({
    status: 409,
    description: 'A syllabus is still attached to this stage',
  })
  remove(@Param('id') id: number, @GetUser('id') userId: number) {
    return this.examStagesService.remove(+id, userId);
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  }
}
