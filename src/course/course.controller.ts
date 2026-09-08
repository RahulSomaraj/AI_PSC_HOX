import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { HttpExceptionFilter } from '../shared/exception-service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { DeleteCourseDto } from './dto/delete-course.dto';

// Writes are admin-only; reads are open to any signed-in account, since
// students browse courses. Nothing here is anonymous - this controller
// previously carried a class-level @Public(), which made all five routes
// reachable without a token.
@ApiTags('course')
@UseFilters(new HttpExceptionFilter('courses'))
@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin', 'course')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new course (Admin only)',
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.courseService.create(createCourseDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all courses',
    description: 'Available to any signed-in account - students browse courses.',
  })
  @ApiResponse({
    status: 200,
    description: 'Courses retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.courseService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  findOne(@Param('id') id: string) {
    return this.courseService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin', 'course')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update course by ID (Admin only)',
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto) {
    return this.courseService.update(+id, updateCourseDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin', 'course')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete course by ID (Admin only)',
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  remove(@Param('id') id: string, @Body() delteCourseDto: DeleteCourseDto) {
    return this.courseService.remove(+id, delteCourseDto);
  }
}
