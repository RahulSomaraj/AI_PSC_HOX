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
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { HttpExceptionFilter } from '../shared/exception-service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@UseFilters(new HttpExceptionFilter('Enrollments'))
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async create(@Body() createEnrollmentDto: CreateEnrollmentDto) {
    return await this.enrollmentsService.create(createEnrollmentDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async findAll() {
    return await this.enrollmentsService.findAll();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getStats() {
    return await this.enrollmentsService.getStats();
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async findByUser(@Param('userId') userId: string) {
    return await this.enrollmentsService.findByUser(+userId);
  }

  @Get('course/:courseId')
  async findByCourse(@Param('courseId') courseId: string) {
    return await this.enrollmentsService.findByCourse(+courseId);
  }

  @Get('course/:courseId/count')
  async getCourseEnrollmentCount(@Param('courseId') courseId: string) {
    const count = await this.enrollmentsService.getCourseEnrollmentCount(
      +courseId,
    );
    return { courseId: +courseId, enrollmentCount: count };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.enrollmentsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async update(
    @Param('id') id: string,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
  ) {
    return await this.enrollmentsService.update(+id, updateEnrollmentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async remove(@Param('id') id: string) {
    await this.enrollmentsService.remove(+id);
    return { message: 'Enrollment deleted successfully' };
  }
}


