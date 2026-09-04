import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { HttpExceptionFilter } from '../shared/exception-service';

@ApiTags('subjects')
@UseFilters(new HttpExceptionFilter('subjects'))
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @Roles(Role.Admin)
  @ApiTags('admin', 'subjects')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a subject (Admin only)',
    description:
      'Subjects are global - one row per subject, reached by every exam through a syllabus item.',
  })
  @ApiBody({
    type: CreateSubjectDto,
    examples: {
      example1: {
        summary: 'Create subject',
        value: {
          name: 'Indian Constitution',
          description: 'Preamble, Fundamental Rights and Directive Principles.',
          sortOrder: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Subject created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 409, description: 'A subject with this name already exists' })
  create(
    @Body() createSubjectDto: CreateSubjectDto,
    @GetUser('id') userId: number,
  ) {
    return this.subjectsService.create(createSubjectDto, userId);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiTags('admin', 'subjects')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List subjects (Admin only)',
    description:
      'Return every live subject, ordered by sortOrder ascending then name.',
  })
  @ApiResponse({ status: 200, description: 'Subjects retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  findAll() {
    return this.subjectsService.findAll();
  }

  @Get(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'subjects')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get subject by ID (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Subject ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Subject retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  findOne(@Param('id') id: number) {
    return this.subjectsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'subjects')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update subject by ID (Admin only)',
    description: 'All fields are optional.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Subject ID', example: 1 })
  @ApiBody({
    type: UpdateSubjectDto,
    examples: {
      rename: { summary: 'Rename', value: { name: 'Indian Polity' } },
      reorder: { summary: 'Reorder', value: { sortOrder: 3 } },
      deactivate: { summary: 'Deactivate', value: { isActive: false } },
    },
  })
  @ApiResponse({ status: 200, description: 'Subject updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  @ApiResponse({ status: 409, description: 'A subject with this name already exists' })
  update(
    @Param('id') id: number,
    @Body() updateSubjectDto: UpdateSubjectDto,
    @GetUser('id') userId: number,
  ) {
    return this.subjectsService.update(+id, updateSubjectDto, userId);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'subjects')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete subject by ID (Admin only)',
    description:
      'Soft delete. No body is required - the deleter is taken from the token.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Subject ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Subject deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  remove(@Param('id') id: number, @GetUser('id') userId: number) {
    return this.subjectsService.remove(+id, userId);
  }
}
