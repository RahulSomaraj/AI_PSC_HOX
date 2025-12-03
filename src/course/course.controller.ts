import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseFilters,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { HttpExceptionFilter } from '../shared/exception-service';
import { Public } from '../common/decorators/public.decorator';
import { DeleteCourseDto } from './dto/delete-course.dto';

@ApiTags('course')
@UseFilters(new HttpExceptionFilter('courses'))
@Public()
@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new course',
    description: 'Create a new course with a unique courseId',
  })
  @ApiBody({ 
    type: CreateCourseDto,
    examples: {
      example1: {
        summary: 'Create geography course',
        value: {
          courseName: 'Geography Quiz',
          courseId: 'GEO101',
          description: 'A comprehensive geography course covering world capitals, countries, and landmarks',
          createdBy: 'admin@example.com',
        },
      },
      example2: {
        summary: 'Create history course',
        value: {
          courseName: 'World History',
          courseId: 'HIST101',
          description: 'Introduction to world history',
          createdBy: 'admin@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Course created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        courseName: { type: 'string', example: 'Geography Quiz' },
        courseId: { type: 'string', example: 'GEO101' },
        description: { type: 'string', example: 'A comprehensive geography course' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.courseService.create(createCourseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses' })
  @ApiResponse({
    status: 200,
    description: 'Courses retrieved successfully',
  })
  findAll() {
    return this.courseService.findAll();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get course by ID',
    description: 'Retrieve course information by course ID',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Course ID', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Course retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        courseName: { type: 'string', example: 'Geography Quiz' },
        courseId: { type: 'string', example: 'GEO101' },
        description: { type: 'string', example: 'A comprehensive geography course' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  findOne(@Param('id') id: string) {
    return this.courseService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update course by ID',
    description: 'Update course information. All fields are optional.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Course ID', example: '1' })
  @ApiBody({ 
    type: UpdateCourseDto,
    examples: {
      example1: {
        summary: 'Update course',
        value: {
          courseName: 'Updated Geography Quiz',
          description: 'Updated description',
          updatedBy: 'admin@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Course updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        courseName: { type: 'string', example: 'Updated Geography Quiz' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    return this.courseService.update(+id, updateCourseDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete course by ID',
    description: 'Delete a course by its ID. Requires deletedBy field in request body.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Course ID', example: '1' })
  @ApiBody({ 
    type: DeleteCourseDto,
    examples: {
      example1: {
        summary: 'Delete course',
        value: {
          deletedBy: 'admin@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Course deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Course deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  remove(@Param('id') id: string, @Body() delteCourseDto: DeleteCourseDto) {
    return this.courseService.remove(+id, delteCourseDto);
  }
}
