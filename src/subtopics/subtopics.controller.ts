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
import { SubtopicsService } from './subtopics.service';
import { CreateSubtopicDto } from './dto/create-subtopic.dto';
import { UpdateSubtopicDto } from './dto/update-subtopic.dto';
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

@ApiTags('subtopics')
@UseFilters(new HttpExceptionFilter('Subtopics'))
@Controller('subtopics')
export class SubtopicsController {
  constructor(private readonly subtopicsService: SubtopicsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a subtopic (Admin only)',
    description: 'Subtopic names are unique within their topic.',
  })
  @ApiBody({
    type: CreateSubtopicDto,
    examples: {
      example1: {
        summary: 'Article 21',
        value: {
          topicId: 4,
          name: 'Article 21',
          description: 'Protection of life and personal liberty',
          sortOrder: 5,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Subtopic created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  @ApiResponse({
    status: 409,
    description: 'Subtopic already exists in that topic',
  })
  async create(
    @Body() createSubtopicDto: CreateSubtopicDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.subtopicsService.create(createSubtopicDto, actorId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List subtopics',
    description:
      'Pass topicId for the subtopics of one topic, or subjectId for every subtopic under a subject.',
  })
  @ApiQuery({ name: 'topicId', required: false, type: 'number' })
  @ApiQuery({ name: 'subjectId', required: false, type: 'number' })
  @ApiQuery({ name: 'isActive', required: false, type: 'boolean' })
  @ApiQuery({ name: 'search', required: false, type: 'string' })
  @ApiResponse({ status: 200, description: 'Subtopics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('topicId') topicId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return await this.subtopicsService.findAll({
      topicId: toOptionalNumber(topicId, 'topicId'),
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
    summary: 'Reorder the subtopics of a topic (Admin only)',
    description:
      'Applies the whole new ordering in one transaction. Every subtopic listed must belong to the same topic.',
  })
  @ApiBody({
    type: ReorderDto,
    examples: {
      example1: {
        summary: 'Put Article 21 first',
        value: {
          items: [
            { id: 9, sortOrder: 1 },
            { id: 7, sortOrder: 2 },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Subtopics reordered successfully' })
  @ApiResponse({
    status: 400,
    description: 'Subtopics belong to different topics, or an ID is repeated',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more subtopics were not found',
  })
  async reorder(
    @Body() reorderDto: ReorderDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.subtopicsService.reorder(reorderDto, actorId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a subtopic by ID' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Subtopic ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Subtopic retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Subtopic not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.subtopicsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Activate or deactivate a subtopic (Admin only)' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Subtopic ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateStatusDto,
    examples: {
      example1: { summary: 'Deactivate', value: { isActive: false } },
    },
  })
  @ApiResponse({ status: 200, description: 'Subtopic status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Subtopic not found' })
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.subtopicsService.setStatus(
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
    summary: 'Update a subtopic (Admin only)',
    description:
      'All fields are optional. A subtopic cannot be moved to another topic - syllabus items map the pair.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Subtopic ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateSubtopicDto,
    examples: {
      example1: {
        summary: 'Update the description',
        value: { description: 'Right to life and personal liberty' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Subtopic updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Subtopic not found' })
  @ApiResponse({
    status: 409,
    description: 'Another subtopic in the topic uses that name',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubtopicDto: UpdateSubtopicDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.subtopicsService.update(id, updateSubtopicDto, actorId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a subtopic (Admin only)',
    description:
      'Soft delete. Refused while the subtopic is mapped in any syllabus.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Subtopic ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Subtopic deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Subtopic not found' })
  @ApiResponse({
    status: 409,
    description: 'Subtopic is still mapped in a syllabus',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') actorId: number,
  ) {
    return await this.subtopicsService.remove(id, actorId);
  }
}
