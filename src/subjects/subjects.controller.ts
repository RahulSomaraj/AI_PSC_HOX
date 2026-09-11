import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { HttpExceptionFilter } from '../shared/exception-service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import {
  toOptionalBoolean,
  toOptionalNumber,
} from '../common/utils/query.util';

/**
 * Subjects are global. One "Indian Constitution" row is shared by every exam
 * that maps it through a syllabus - there is no per-exam copy.
 */
@ApiTags('subjects')
@UseFilters(new HttpExceptionFilter('Subjects'))
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a subject (Admin only)',
    description:
      'Subject names are unique across the whole system. Do not create per-exam copies such as "SI Constitution" - create one subject and map it to the exams that need it.',
  })
  @ApiBody({
    type: CreateSubjectDto,
    examples: {
      example1: {
        summary: 'Indian Constitution',
        value: {
          name: 'Indian Constitution',
          description: 'The Constitution of India, its articles and amendments',
          sortOrder: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Subject created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 409, description: 'Subject already exists' })
  async create(
    @Body() createSubjectDto: CreateSubjectDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.subjectsService.create(createSubjectDto, actorId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List subjects' })
  @ApiQuery({ name: 'isActive', required: false, type: 'boolean' })
  @ApiQuery({ name: 'search', required: false, type: 'string' })
  @ApiResponse({ status: 200, description: 'Subjects retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return await this.subjectsService.findAll({
      isActive: toOptionalBoolean(isActive, 'isActive'),
      search,
    });
  }

  @Get('hierarchy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get the global academic hierarchy',
    description:
      'Subjects with their topics and subtopics nested, independent of any exam. This is what the admin syllabus picker reads.',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: 'boolean',
    description: 'Applied at every level of the tree',
  })
  @ApiQuery({
    name: 'subjectId',
    required: false,
    type: 'number',
    description: 'Limit the tree to one subject',
  })
  @ApiResponse({
    status: 200,
    description: 'Academic hierarchy retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          name: { type: 'string', example: 'Indian Constitution' },
          topics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 4 },
                name: { type: 'string', example: 'Fundamental Rights' },
                subtopics: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number', example: 9 },
                      name: { type: 'string', example: 'Article 21' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHierarchy(
    @Query('isActive') isActive?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return await this.subjectsService.getHierarchy({
      isActive: toOptionalBoolean(isActive, 'isActive'),
      subjectId: toOptionalNumber(subjectId, 'subjectId'),
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a subject by ID' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Subject ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Subject retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.subjectsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Activate or deactivate a subject (Admin only)' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Subject ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateStatusDto,
    examples: {
      example1: { summary: 'Deactivate', value: { isActive: false } },
    },
  })
  @ApiResponse({ status: 200, description: 'Subject status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.subjectsService.setStatus(
      id,
      updateStatusDto.isActive,
      actorId,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a subject (Admin only)',
    description: 'All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Subject ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateSubjectDto,
    examples: {
      example1: {
        summary: 'Update the description',
        value: { description: 'Articles, schedules and amendments' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Subject updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  @ApiResponse({ status: 409, description: 'Another subject uses that name' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubjectDto: UpdateSubjectDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.subjectsService.update(id, updateSubjectDto, actorId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a subject (Admin only)',
    description:
      'Soft delete. Refused while the subject still has topics or is mapped in any syllabus, because the row is shared across exams.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Subject ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Subject deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  @ApiResponse({
    status: 409,
    description: 'Subject still has topics or mappings',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') actorId: number,
  ) {
    return await this.subjectsService.remove(id, actorId);
  }
}
