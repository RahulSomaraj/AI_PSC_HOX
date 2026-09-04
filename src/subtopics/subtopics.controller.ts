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
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { HttpExceptionFilter } from '../shared/exception-service';

@ApiTags('subtopics')
@UseFilters(new HttpExceptionFilter('subtopics'))
@Controller('subtopics')
export class SubtopicsController {
  constructor(private readonly subtopicsService: SubtopicsService) {}

  @Post()
  @Roles(Role.Admin)
  @ApiTags('admin', 'subtopics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a subtopic (Admin only)',
    description:
      'A subtopic is a division of one topic, and the finest depth a syllabus item can map to.',
  })
  @ApiBody({
    type: CreateSubtopicDto,
    examples: {
      example1: {
        summary: 'Create subtopic',
        value: {
          topicId: 1,
          name: 'Right to Equality',
          description: 'Articles 14 to 18.',
          sortOrder: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Subtopic created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Subtopic ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Subtopic retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
      rename: { summary: 'Rename', value: { name: 'Right to Freedom' } },
      reparent: { summary: 'Move to another topic', value: { topicId: 2 } },
      reorder: { summary: 'Reorder', value: { sortOrder: 3 } },
    },
  })
  @ApiResponse({ status: 200, description: 'Subtopic updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Subtopic ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Subtopic deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Subtopic not found' })
  remove(@Param('id') id: number, @GetUser('id') userId: number) {
    return this.subtopicsService.remove(+id, userId);
  }
}
