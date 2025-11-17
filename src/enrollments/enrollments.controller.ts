import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { HttpExceptionFilter } from '../shared/exception-service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('enrollments')
@UseFilters(new HttpExceptionFilter('Enrollments'))
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Create a new enrollment (Admin only)',
    description: 'Enroll a user in a course. Requires admin role.',
  })
  @ApiBody({ 
    type: CreateEnrollmentDto,
    examples: {
      example1: {
        summary: 'Create enrollment',
        value: {
          userId: 1,
          courseId: 1,
          status: 'pending',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Enrollment created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        userId: { type: 'number', example: 1 },
        courseId: { type: 'number', example: 1 },
        status: { type: 'string', example: 'pending' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async create(@Body() createEnrollmentDto: CreateEnrollmentDto) {
    return await this.enrollmentsService.create(createEnrollmentDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get all enrollments (Admin only)',
    description: 'Retrieve all enrollments. Requires admin role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollments retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          userId: { type: 'number', example: 1 },
          courseId: { type: 'number', example: 1 },
          status: { type: 'string', example: 'active' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    return await this.enrollmentsService.findAll();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get enrollment statistics (Admin only)',
    description: 'Retrieve enrollment statistics including total enrollments, by status, and by course.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalEnrollments: { type: 'number', example: 100 },
        byStatus: {
          type: 'object',
          properties: {
            active: { type: 'number', example: 50 },
            completed: { type: 'number', example: 30 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStats() {
    return await this.enrollmentsService.getStats();
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get enrollments by user ID (Admin only)',
    description: 'Retrieve all enrollments for a specific user. Requires admin role.',
  })
  @ApiParam({ 
    name: 'userId', 
    type: 'string', 
    description: 'User ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollments retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          userId: { type: 'number', example: 1 },
          courseId: { type: 'number', example: 1 },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByUser(@Param('userId') userId: string) {
    return await this.enrollmentsService.findByUser(+userId);
  }

  @Get('course/:courseId')
  @ApiOperation({ 
    summary: 'Get enrollments by course ID',
    description: 'Retrieve all enrollments for a specific course',
  })
  @ApiParam({ 
    name: 'courseId', 
    type: 'string', 
    description: 'Course ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollments retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          userId: { type: 'number', example: 1 },
          courseId: { type: 'number', example: 1 },
        },
      },
    },
  })
  async findByCourse(@Param('courseId') courseId: string) {
    return await this.enrollmentsService.findByCourse(+courseId);
  }

  @Get('course/:courseId/count')
  @ApiOperation({ 
    summary: 'Get enrollment count for a course',
    description: 'Get the total number of enrollments for a specific course',
  })
  @ApiParam({ 
    name: 'courseId', 
    type: 'string', 
    description: 'Course ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollment count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        courseId: { type: 'number', example: 1 },
        enrollmentCount: { type: 'number', example: 25 },
      },
    },
  })
  async getCourseEnrollmentCount(@Param('courseId') courseId: string) {
    const count = await this.enrollmentsService.getCourseEnrollmentCount(
      +courseId,
    );
    return { courseId: +courseId, enrollmentCount: count };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get enrollment by ID',
    description: 'Retrieve a specific enrollment by its ID',
  })
  @ApiParam({ 
    name: 'id', 
    type: 'string', 
    description: 'Enrollment ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollment retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        userId: { type: 'number', example: 1 },
        courseId: { type: 'number', example: 1 },
        status: { type: 'string', example: 'active' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async findOne(@Param('id') id: string) {
    return await this.enrollmentsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update enrollment by ID (Admin only)',
    description: 'Update enrollment status or completion date. Requires admin role.',
  })
  @ApiParam({ 
    name: 'id', 
    type: 'string', 
    description: 'Enrollment ID',
    example: '1',
  })
  @ApiBody({ 
    type: UpdateEnrollmentDto,
    examples: {
      example1: {
        summary: 'Update enrollment status',
        value: {
          status: 'completed',
          completedAt: '2025-10-29T12:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollment updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        status: { type: 'string', example: 'completed' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async update(
    @Param('id') id: string,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
  ) {
    return await this.enrollmentsService.update(+id, updateEnrollmentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Delete enrollment by ID (Admin only)',
    description: 'Delete an enrollment. Requires admin role.',
  })
  @ApiParam({ 
    name: 'id', 
    type: 'string', 
    description: 'Enrollment ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollment deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Enrollment deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async remove(@Param('id') id: string) {
    await this.enrollmentsService.remove(+id);
    return { message: 'Enrollment deleted successfully' };
  }
}


