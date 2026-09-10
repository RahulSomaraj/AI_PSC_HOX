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
<<<<<<< HEAD
import { ReorderDto } from '../common/dto/reorder.dto';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { HttpExceptionFilter } from '../shared/exception-service';
=======
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
<<<<<<< HEAD
import {
  toOptionalBoolean,
  toOptionalNumber,
} from '../common/utils/query.util';

@ApiTags('subtopics')
@UseFilters(new HttpExceptionFilter('Subtopics'))
=======
import { HttpExceptionFilter } from '../shared/exception-service';

@ApiTags('subtopics')
@UseFilters(new HttpExceptionFilter('subtopics'))
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
@Controller('subtopics')
export class SubtopicsController {
  constructor(private readonly subtopicsService: SubtopicsService) {}

  @Post()
<<<<<<< HEAD
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a subtopic (Admin only)',
    description: 'Subtopic names are unique within their topic.',
=======
  @Roles(Role.Admin)
  @ApiTags('admin', 'subtopics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a subtopic (Admin only)',
    description:
      'A subtopic is a division of one topic, and the finest depth a syllabus item can map to.',
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  })
  @ApiBody({
    type: CreateSubtopicDto,
    examples: {
      example1: {
<<<<<<< HEAD
        summary: 'Article 21',
        value: {
          topicId: 4,
          name: 'Article 21',
          description: 'Protection of life and personal liberty',
          sortOrder: 5,
=======
        summary: 'Create subtopic',
        value: {
          topicId: 1,
          name: 'Right to Equality',
          description: 'Articles 14 to 18.',
          sortOrder: 1,
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Subtopic created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
<<<<<<< HEAD
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
=======
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  @ApiResponse({
    status: 409,
    description: 'A subtopic with this name already exists in this topic',
  })
  create(
    @Body() createSubtopicDto: CreateSubtopicDto,
    @GetUser('id') userId: number,
  ) {
    return this.subtopicsService.create(createSubtopicDto, userId);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiTags('admin', 'subtopics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List subtopics (Admin only)',
    description:
      'Return every live subtopic, ordered by sortOrder ascending then name. Pass topicId to list the subtopics of one topic.',
  })
  @ApiQuery({
    name: 'topicId',
    required: false,
    type: Number,
    example: 1,
    description:
      'Restrict to one topic. An unknown topic returns an empty list, not 404.',
  })
  @ApiResponse({ status: 200, description: 'Subtopics retrieved successfully' })
  @ApiResponse({ status: 400, description: 'topicId must be an integer' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  findAll(
    @Query('topicId', new ParseIntPipe({ optional: true }))
    topicId?: number,
  ) {
    return this.subtopicsService.findAll(topicId);
  }

  @Get(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'subtopics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get subtopic by ID (Admin only)' })
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Subtopic ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Subtopic retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
<<<<<<< HEAD
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
=======
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Subtopic not found' })
  findOne(@Param('id') id: number) {
    return this.subtopicsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'subtopics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update subtopic by ID (Admin only)',
    description:
      'All fields are optional. Sending topicId reparents the subtopic to another topic.',
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
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
<<<<<<< HEAD
      example1: {
        summary: 'Update the description',
        value: { description: 'Right to life and personal liberty' },
      },
=======
      rename: { summary: 'Rename', value: { name: 'Right to Freedom' } },
      reparent: { summary: 'Move to another topic', value: { topicId: 2 } },
      reorder: { summary: 'Reorder', value: { sortOrder: 3 } },
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
    },
  })
  @ApiResponse({ status: 200, description: 'Subtopic updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
<<<<<<< HEAD
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
=======
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Subtopic or topic not found' })
  @ApiResponse({
    status: 409,
    description: 'A subtopic with this name already exists in this topic',
  })
  update(
    @Param('id') id: number,
    @Body() updateSubtopicDto: UpdateSubtopicDto,
    @GetUser('id') userId: number,
  ) {
    return this.subtopicsService.update(+id, updateSubtopicDto, userId);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'subtopics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete subtopic by ID (Admin only)',
    description:
      'Soft delete. No body is required - the deleter is taken from the token.',
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Subtopic ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Subtopic deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
<<<<<<< HEAD
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
=======
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Subtopic not found' })
  remove(@Param('id') id: number, @GetUser('id') userId: number) {
    return this.subtopicsService.remove(+id, userId);
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  }
}
