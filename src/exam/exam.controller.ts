import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { ExamResponseDto, ExamResultDto } from './dto/exam-response.dto';
import { HttpExceptionFilter } from '../shared/exception-service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('exam')
@ApiBearerAuth('JWT-auth')
@UseFilters(new HttpExceptionFilter('Exam'))
@Controller('exam')
@UseGuards(JwtAuthGuard)
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new exam' })
  @ApiBody({ type: CreateExamDto })
  @ApiResponse({
    status: 201,
    description: 'Exam created successfully',
    type: ExamResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createExamDto: CreateExamDto,
    @GetUser('id') userId: number,
  ) {
    return await this.examService.create(createExamDto, userId);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start an exam' })
  @ApiParam({ name: 'id', type: 'string', description: 'Exam ID' })
  @ApiResponse({
    status: 200,
    description: 'Exam started successfully',
    type: ExamResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiResponse({ status: 400, description: 'Exam cannot be started' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async start(
    @Param('id') id: string,
    @GetUser('id') userId: number,
  ) {
    return await this.examService.start(+id, userId);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit exam answers' })
  @ApiParam({ name: 'id', type: 'string', description: 'Exam ID' })
  @ApiBody({ 
    type: SubmitExamDto,
    description: 'Answers object with questionId as key and selected answer as value',
  })
  @ApiResponse({
    status: 200,
    description: 'Exam submitted successfully',
    type: ExamResultDto,
  })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiResponse({ status: 400, description: 'Invalid submission or exam not in progress' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async submit(
    @Param('id') id: string,
    @Body() submitExamDto: Omit<SubmitExamDto, 'examId'>,
    @GetUser('id') userId: number,
  ) {
    return await this.examService.submit(
      { ...submitExamDto, examId: +id },
      userId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exam by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Exam ID' })
  @ApiResponse({
    status: 200,
    description: 'Exam retrieved successfully',
    type: ExamResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @Param('id') id: string,
    @GetUser('id') userId: number,
  ) {
    return await this.examService.findOne(+id, userId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all exams for a specific user' })
  @ApiParam({ name: 'userId', type: 'string', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Exams retrieved successfully',
    type: [ExamResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByUser(@Param('userId') userId: string) {
    return await this.examService.findByUser(+userId);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get all exams for a specific course' })
  @ApiParam({ name: 'courseId', type: 'string', description: 'Course ID' })
  @ApiResponse({
    status: 200,
    description: 'Exams retrieved successfully',
    type: [ExamResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByCourse(@Param('courseId') courseId: string) {
    return await this.examService.findByCourse(+courseId);
  }
}


