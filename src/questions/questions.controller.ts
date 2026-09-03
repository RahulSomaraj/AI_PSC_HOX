import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { AnswerQuestionDto } from './dto/answer-question.dto';
import { BulkQuestionsDto } from './dto/bulk-questions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { HttpExceptionFilter } from '../shared/exception-service';
import { LoggingInterceptor } from '../interceptors/logging-interceptors';

@ApiTags('questions')
@UseFilters(new HttpExceptionFilter('Questions'))
@UseInterceptors(LoggingInterceptor)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin', 'questions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Create a new question (Admin only)',
    description: 'Create a new question for a course. Requires admin role.',
  })
  @ApiBody({ 
    type: CreateQuestionDto,
    examples: {
      example1: {
        summary: 'Create geography question',
        value: {
          courseId: 1,
          question: 'What is the capital of France?',
          answers: ['Paris', 'London', 'Berlin', 'Madrid'],
          correctAnswer: 'Paris',
          difficulty: 2,
          points: 5,
          explanation: 'Paris has been the capital of France since 987 AD',
          tags: ['geography', 'europe', 'capitals'],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Question created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        question: { type: 'string', example: 'What is the capital of France?' },
        courseId: { type: 'number', example: 1 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async create(
    @Body() createQuestionDto: CreateQuestionDto,
    @GetUser('id') createdBy: number,
  ) {
    return await this.questionsService.create(createQuestionDto, createdBy);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all questions or filter by courseId',
    description: 'Retrieve all questions or filter by courseId using query parameter',
  })
  @ApiQuery({ 
    name: 'courseId', 
    required: false, 
    type: Number, 
    description: 'Filter by course ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          question: { type: 'string', example: 'What is the capital of France?' },
          courseId: { type: 'number', example: 1 },
        },
      },
    },
  })
  async findAll(@Query('courseId') courseId?: number) {
    if (courseId) {
      return await this.questionsService.findByCourse(+courseId);
    }
    return await this.questionsService.findAll();
  }

  @Get('random')
  @ApiOperation({ 
    summary: 'Get random questions for a course',
    description: 'Retrieve random questions from a specific course',
  })
  @ApiQuery({ 
    name: 'courseId', 
    required: true, 
    type: Number, 
    description: 'Course ID',
    example: 1,
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number, 
    description: 'Number of questions (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Random questions retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          question: { type: 'string', example: 'What is the capital of France?' },
        },
      },
    },
  })
  async getRandomQuestions(
    @Query('courseId') courseId: number,
    @Query('limit') limit?: number,
  ) {
    return await this.questionsService.getRandomQuestions(
      +courseId,
      limit ? +limit : 10,
    );
  }

  @Get('difficulty/:difficulty')
  @ApiOperation({ 
    summary: 'Get questions by difficulty level',
    description: 'Retrieve questions filtered by difficulty level (1-5)',
  })
  @ApiParam({ 
    name: 'difficulty', 
    type: 'number', 
    description: 'Difficulty level (1-5)',
    example: 2,
  })
  @ApiQuery({ 
    name: 'courseId', 
    required: true, 
    type: Number, 
    description: 'Course ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          question: { type: 'string', example: 'What is the capital of France?' },
          difficulty: { type: 'number', example: 2 },
        },
      },
    },
  })
  async getQuestionsByDifficulty(
    @Param('difficulty') difficulty: number,
    @Query('courseId') courseId: number,
  ) {
    return await this.questionsService.getQuestionsByDifficulty(
      +courseId,
      +difficulty,
    );
  }

  @Get('tags')
  @ApiOperation({ 
    summary: 'Get questions by tags',
    description: 'Retrieve questions filtered by tags (comma-separated)',
  })
  @ApiQuery({ 
    name: 'courseId', 
    required: true, 
    type: Number, 
    description: 'Course ID',
    example: 1,
  })
  @ApiQuery({ 
    name: 'tags', 
    required: true, 
    type: String, 
    description: 'Comma-separated tags',
    example: 'geography,europe,capitals',
  })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          question: { type: 'string', example: 'What is the capital of France?' },
          tags: { type: 'array', items: { type: 'string' }, example: ['geography', 'europe'] },
        },
      },
    },
  })
  async getQuestionsByTags(
    @Query('courseId') courseId: number,
    @Query('tags') tags: string,
  ) {
    const tagArray = tags.split(',').map((tag) => tag.trim());
    return await this.questionsService.getQuestionsByTags(+courseId, tagArray);
  }

  @Get('stats/:courseId')
  @ApiOperation({ 
    summary: 'Get question statistics for a course',
    description: 'Retrieve statistics about questions in a course (count by difficulty, tags, etc.)',
  })
  @ApiParam({ 
    name: 'courseId', 
    type: 'number', 
    description: 'Course ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Question statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalQuestions: { type: 'number', example: 50 },
        byDifficulty: {
          type: 'object',
          properties: {
            '1': { type: 'number', example: 10 },
            '2': { type: 'number', example: 15 },
          },
        },
      },
    },
  })
  async getQuestionStats(@Param('courseId') courseId: number) {
    return await this.questionsService.getQuestionStats(+courseId);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get question by ID',
    description: 'Retrieve a question by its ID',
  })
  @ApiParam({ 
    name: 'id', 
    type: 'string', 
    description: 'Question ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Question retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        question: { type: 'string', example: 'What is the capital of France?' },
        answers: { type: 'array', items: { type: 'string' }, example: ['Paris', 'London', 'Berlin', 'Madrid'] },
        correctAnswer: { type: 'string', example: 'Paris' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async findOne(@Param('id') id: string) {
    return await this.questionsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin', 'questions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update question by ID (Admin only)' })
  @ApiParam({ name: 'id', type: 'string', description: 'Question ID' })
  @ApiBody({ type: UpdateQuestionDto })
  @ApiResponse({
    status: 200,
    description: 'Question updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @GetUser('id') updatedBy: number,
  ) {
    return await this.questionsService.update(
      +id,
      updateQuestionDto,
      updatedBy,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin', 'questions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete question by ID (Admin only)' })
  @ApiParam({ name: 'id', type: 'string', description: 'Question ID' })
  @ApiResponse({
    status: 200,
    description: 'Question deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async remove(@Param('id') id: string) {
    return await this.questionsService.remove(+id);
  }

  @Delete(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin', 'questions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Deactivate question by ID (Admin only)' })
  @ApiParam({ name: 'id', type: 'string', description: 'Question ID' })
  @ApiResponse({
    status: 200,
    description: 'Question deactivated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async softDelete(@Param('id') id: string) {
    return await this.questionsService.softDelete(+id);
  }

  @Post('answer')
  @ApiOperation({ 
    summary: 'Submit answer to a question',
    description: 'Submit an answer to a question and get immediate feedback',
  })
  @ApiBody({ 
    type: AnswerQuestionDto,
    examples: {
      example1: {
        summary: 'Answer a question',
        value: {
          questionId: 1,
          selectedAnswer: 'Paris',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Answer submitted successfully',
    schema: {
      type: 'object',
      properties: {
        isCorrect: { type: 'boolean', example: true },
        correctAnswer: { type: 'string', example: 'Paris' },
        points: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid answer or question not found' })
  async answerQuestion(@Body() answerQuestionDto: AnswerQuestionDto) {
    return await this.questionsService.answerQuestion(answerQuestionDto);
  }

  @Post('bulk')
  @Public()
  @ApiOperation({ 
    summary: 'Get multiple questions by IDs',
    description: 'Retrieve multiple questions at once by providing an array of question IDs (1-50 questions)',
  })
  @ApiBody({ 
    type: BulkQuestionsDto,
    examples: {
      example1: {
        summary: 'Get multiple questions',
        value: {
          questionIds: [1, 2, 3, 4, 5],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              question: { type: 'string', example: 'What is the capital of France?' },
            },
          },
        },
        totalFound: { type: 'number', example: 5 },
        notFound: { type: 'array', items: { type: 'number' }, example: [] },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async getBulkQuestions(@Body() bulkQuestionsDto: BulkQuestionsDto) {
    return await this.questionsService.getBulkQuestions(bulkQuestionsDto);
  }
}
