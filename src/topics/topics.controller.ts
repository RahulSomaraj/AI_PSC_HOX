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
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { ReorderDto } from '../common/dto/reorder.dto';
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

@ApiTags('topics')
@UseFilters(new HttpExceptionFilter('Topics'))
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a topic (Admin only)',
    description: 'Topic names are unique within their subject.',
  })
  @ApiBody({
    type: CreateTopicDto,
    examples: {
      example1: {
        summary: 'Fundamental Rights',
        value: {
          subjectId: 1,
          name: 'Fundamental Rights',
          description: 'Articles 12 to 35',
          sortOrder: 3,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Topic created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  @ApiResponse({
    status: 409,
    description: 'Topic already exists in that subject',
  })
  async create(
    @Body() createTopicDto: CreateTopicDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.topicsService.create(createTopicDto, actorId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List topics',
    description: 'Pass subjectId to list the topics of one subject.',
  })
  @ApiQuery({ name: 'subjectId', required: false, type: 'number' })
  @ApiQuery({ name: 'isActive', required: false, type: 'boolean' })
  @ApiQuery({ name: 'search', required: false, type: 'string' })
  @ApiResponse({ status: 200, description: 'Topics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('subjectId') subjectId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return await this.topicsService.findAll({
      subjectId: toOptionalNumber(subjectId, 'subjectId'),
      isActive: toOptionalBoolean(isActive, 'isActive'),
      search,
    });
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reorder the topics of a subject (Admin only)',
    description:
      'Applies the whole new ordering in one transaction. Every topic listed must belong to the same subject.',
  })
  @ApiBody({
    type: ReorderDto,
    examples: {
      example1: {
        summary: 'Move Fundamental Rights to the top',
        value: {
          items: [
            { id: 4, sortOrder: 1 },
            { id: 2, sortOrder: 2 },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Topics reordered successfully' })
  @ApiResponse({
    status: 400,
    description: 'Topics belong to different subjects, or an ID is repeated',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more topics were not found',
  })
  async reorder(
    @Body() reorderDto: ReorderDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.topicsService.reorder(reorderDto, actorId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a topic by ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'Topic ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Topic retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.topicsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Activate or deactivate a topic (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Topic ID', example: 1 })
  @ApiBody({
    type: UpdateStatusDto,
    examples: {
      example1: { summary: 'Deactivate', value: { isActive: false } },
    },
  })
  @ApiResponse({ status: 200, description: 'Topic status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.topicsService.setStatus(
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
    summary: 'Update a topic (Admin only)',
    description:
      'All fields are optional. A topic cannot be moved to another subject - syllabus items map the pair.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Topic ID', example: 1 })
  @ApiBody({
    type: UpdateTopicDto,
    examples: {
      example1: { summary: 'Rename', value: { name: 'Fundamental Rights' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Topic updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  @ApiResponse({
    status: 409,
    description: 'Another topic in the subject uses that name',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTopicDto: UpdateTopicDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.topicsService.update(id, updateTopicDto, actorId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a topic (Admin only)',
    description:
      'Soft delete. Refused while the topic still has subtopics or is mapped in any syllabus.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Topic ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Topic deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  @ApiResponse({
    status: 409,
    description: 'Topic still has subtopics or mappings',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') actorId: number,
  ) {
    return await this.topicsService.remove(id, actorId);
  }
}
