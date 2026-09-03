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
import { ReorderExamStagesDto } from './dto/reorder-exam-stages.dto';
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

@ApiTags('exam-stages')
@UseFilters(new HttpExceptionFilter('ExamStages'))
@Controller('exam-stages')
export class ExamStagesController {
  constructor(private readonly examStagesService: ExamStagesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create an exam stage (Admin only)',
    description:
      'Stages are data, not code - an exam can have any number of them. When stageOrder is omitted the stage is appended after the existing ones.',
  })
  @ApiBody({
    type: CreateExamStageDto,
    examples: {
      example1: {
        summary: 'Preliminary examination',
        value: {
          examId: 1,
          name: 'Preliminary Examination',
          stageOrder: 1,
          examMode: 'objective',
          totalQuestions: 100,
          totalMarks: 100,
          durationMinutes: 75,
          negativeMark: 0.33,
        },
      },
      example2: {
        summary: 'Physical efficiency test',
        value: {
          examId: 1,
          name: 'Physical Efficiency Test',
          stageOrder: 3,
          examMode: 'physical',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Exam stage created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiResponse({
    status: 200,
    description: 'Exam stages retrieved successfully',
  })
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
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam stage ID',
    example: 1,
  })
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
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam stage ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Exam stage deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  }
}
