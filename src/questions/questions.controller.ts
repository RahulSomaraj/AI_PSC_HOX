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

@UseFilters(new HttpExceptionFilter('Questions'))
@UseInterceptors(LoggingInterceptor)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async create(
    @Body() createQuestionDto: CreateQuestionDto,
    @GetUser('id') createdBy: number,
  ) {
    return await this.questionsService.create(createQuestionDto, createdBy);
  }

  @Get()
  async findAll(@Query('courseId') courseId?: number) {
    if (courseId) {
      return await this.questionsService.findByCourse(+courseId);
    }
    return await this.questionsService.findAll();
  }

  @Get('random')
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
  async getQuestionsByTags(
    @Query('courseId') courseId: number,
    @Query('tags') tags: string,
  ) {
    const tagArray = tags.split(',').map((tag) => tag.trim());
    return await this.questionsService.getQuestionsByTags(+courseId, tagArray);
  }

  @Get('stats/:courseId')
  async getQuestionStats(@Param('courseId') courseId: number) {
    return await this.questionsService.getQuestionStats(+courseId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.questionsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
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
  async remove(@Param('id') id: string) {
    return await this.questionsService.remove(+id);
  }

  @Delete(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async softDelete(@Param('id') id: string) {
    return await this.questionsService.softDelete(+id);
  }

  @Post('answer')
  async answerQuestion(@Body() answerQuestionDto: AnswerQuestionDto) {
    return await this.questionsService.answerQuestion(answerQuestionDto);
  }

  @Post('bulk')
  @Public()
  async getBulkQuestions(@Body() bulkQuestionsDto: BulkQuestionsDto) {
    return await this.questionsService.getBulkQuestions(bulkQuestionsDto);
  }
}
