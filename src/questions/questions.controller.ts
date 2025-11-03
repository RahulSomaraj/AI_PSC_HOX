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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new question (Admin only)' })
  @ApiBody({ type: CreateQuestionDto })
  @ApiResponse({
    status: 201,
    description: 'Question created successfully',
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
  @ApiOperation({ summary: 'Get all questions or filter by courseId' })
  @ApiQuery({ name: 'courseId', required: false, type: Number, description: 'Filter by course ID' })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
  })
  async findAll(@Query('courseId') courseId?: number) {
    if (courseId) {
      return await this.questionsService.findByCourse(+courseId);
    }
    return await this.questionsService.findAll();
  }

  @Get('random')
  @ApiOperation({ summary: 'Get random questions for a course' })
  @ApiQuery({ name: 'courseId', required: true, type: Number, description: 'Course ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of questions (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Random questions retrieved successfully',
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
  @ApiOperation({ summary: 'Get questions by difficulty level' })
  @ApiParam({ name: 'difficulty', type: 'number', description: 'Difficulty level (1-5)' })
  @ApiQuery({ name: 'courseId', required: true, type: Number, description: 'Course ID' })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
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
  @ApiOperation({ summary: 'Get questions by tags' })
  @ApiQuery({ name: 'courseId', required: true, type: Number, description: 'Course ID' })
  @ApiQuery({ name: 'tags', required: true, type: String, description: 'Comma-separated tags' })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
  })
  async getQuestionsByTags(
    @Query('courseId') courseId: number,
    @Query('tags') tags: string,
  ) {
    const tagArray = tags.split(',').map((tag) => tag.trim());
    return await this.questionsService.getQuestionsByTags(+courseId, tagArray);
  }

  @Get('stats/:courseId')
  @ApiOperation({ summary: 'Get question statistics for a course' })
  @ApiParam({ name: 'courseId', type: 'number', description: 'Course ID' })
  @ApiResponse({
    status: 200,
    description: 'Question statistics retrieved successfully',
  })
  async getQuestionStats(@Param('courseId') courseId: number) {
    return await this.questionsService.getQuestionStats(+courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get question by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Question ID' })
  @ApiResponse({
    status: 200,
    description: 'Question retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async findOne(@Param('id') id: string) {
    return await this.questionsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
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
  @ApiOperation({ summary: 'Submit answer to a question' })
  @ApiBody({ type: AnswerQuestionDto })
  @ApiResponse({
    status: 200,
    description: 'Answer submitted successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid answer or question not found' })
  async answerQuestion(@Body() answerQuestionDto: AnswerQuestionDto) {
    return await this.questionsService.answerQuestion(answerQuestionDto);
  }

  @Post('bulk')
  @Public()
  @ApiOperation({ summary: 'Get multiple questions by IDs' })
  @ApiBody({ type: BulkQuestionsDto })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async getBulkQuestions(@Body() bulkQuestionsDto: BulkQuestionsDto) {
    return await this.questionsService.getBulkQuestions(bulkQuestionsDto);
  }
}
