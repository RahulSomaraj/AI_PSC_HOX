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
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { HttpExceptionFilter } from '../shared/exception-service';

@ApiTags('topics')
@UseFilters(new HttpExceptionFilter('topics'))
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Post()
  @Roles(Role.Admin)
  @ApiTags('admin', 'topics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a topic (Admin only)',
    description: 'A topic is a division of one subject.',
  })
  @ApiBody({
    type: CreateTopicDto,
    examples: {
      example1: {
        summary: 'Create topic',
        value: {
          subjectId: 1,
          name: 'Fundamental Rights',
          description: 'Articles 12 to 35 of the Constitution.',
          sortOrder: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Topic created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  @ApiResponse({
    status: 409,
    description: 'A topic with this name already exists in this subject',
  })
  create(
    @Body() createTopicDto: CreateTopicDto,
    @GetUser('id') userId: number,
  ) {
    return this.topicsService.create(createTopicDto, userId);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiTags('admin', 'topics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List topics (Admin only)',
    description:
      'Return every live topic, ordered by sortOrder ascending then name. Pass subjectId to list the topics of one subject.',
  })
  @ApiQuery({
    name: 'subjectId',
    required: false,
    type: Number,
    example: 1,
    description:
      'Restrict to one subject. An unknown subject returns an empty list, not 404.',
  })
  @ApiResponse({ status: 200, description: 'Topics retrieved successfully' })
  @ApiResponse({ status: 400, description: 'subjectId must be an integer' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  findAll(
    @Query('subjectId', new ParseIntPipe({ optional: true }))
    subjectId?: number,
  ) {
    return this.topicsService.findAll(subjectId);
  }

  @Get(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'topics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get topic by ID (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Topic ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Topic retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  findOne(@Param('id') id: number) {
    return this.topicsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'topics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update topic by ID (Admin only)',
    description:
      'All fields are optional. Sending subjectId reparents the topic to another subject.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Topic ID', example: 1 })
  @ApiBody({
    type: UpdateTopicDto,
    examples: {
      rename: { summary: 'Rename', value: { name: 'Directive Principles' } },
      reparent: { summary: 'Move to another subject', value: { subjectId: 2 } },
      reorder: { summary: 'Reorder', value: { sortOrder: 3 } },
    },
  })
  @ApiResponse({ status: 200, description: 'Topic updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Topic or subject not found' })
  @ApiResponse({
    status: 409,
    description: 'A topic with this name already exists in this subject',
  })
  update(
    @Param('id') id: number,
    @Body() updateTopicDto: UpdateTopicDto,
    @GetUser('id') userId: number,
  ) {
    return this.topicsService.update(+id, updateTopicDto, userId);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'topics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete topic by ID (Admin only)',
    description:
      'Soft delete. No body is required - the deleter is taken from the token.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Topic ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Topic deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Topic not found' })
  remove(@Param('id') id: number, @GetUser('id') userId: number) {
    return this.topicsService.remove(+id, userId);
  }
}
