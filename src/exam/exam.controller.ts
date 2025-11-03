import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { HttpExceptionFilter } from '../shared/exception-service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@UseFilters(new HttpExceptionFilter('Exam'))
@Controller('exam')
@UseGuards(JwtAuthGuard)
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post()
  async create(
    @Body() createExamDto: CreateExamDto,
    @GetUser('id') userId: number,
  ) {
    return await this.examService.create(createExamDto, userId);
  }

  @Post(':id/start')
  async start(
    @Param('id') id: string,
    @GetUser('id') userId: number,
  ) {
    return await this.examService.start(+id, userId);
  }

  @Post(':id/submit')
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
  async findOne(
    @Param('id') id: string,
    @GetUser('id') userId: number,
  ) {
    return await this.examService.findOne(+id, userId);
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return await this.examService.findByUser(+userId);
  }

  @Get('course/:courseId')
  async findByCourse(@Param('courseId') courseId: string) {
    return await this.examService.findByCourse(+courseId);
  }
}


