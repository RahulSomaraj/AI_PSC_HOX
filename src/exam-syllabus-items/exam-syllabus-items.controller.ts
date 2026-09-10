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
import { ExamSyllabusItemsService } from './exam-syllabus-items.service';
import { CreateExamSyllabusItemDto } from './dto/create-exam-syllabus-item.dto';
import { UpdateExamSyllabusItemDto } from './dto/update-exam-syllabus-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { HttpExceptionFilter } from '../shared/exception-service';

// No @GetUser anywhere in this controller: exam_syllabus_items carries only
// createdAt, with no actor columns, so there is no createdBy or updatedBy to
// take from the token.
@ApiTags('exam-syllabus-items')
@UseFilters(new HttpExceptionFilter('exam-syllabus-items'))
@Controller('exam-syllabus-items')
export class ExamSyllabusItemsController {
  constructor(private readonly itemsService: ExamSyllabusItemsService) {}

  @Post()
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-syllabus-items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Add an item to a syllabus (Admin only)',
    description:
      'An item maps a syllabus onto the academic taxonomy at one of three ' +
      'depths: a whole subject, one topic of it, or one subtopic of that. ' +
      'The same combination cannot be mapped twice in one syllabus.',
  })
  @ApiBody({
    type: CreateExamSyllabusItemDto,
    examples: {
      wholeSubject: {
        summary: 'Map a whole subject',
        value: {
          syllabusId: 1,
          subjectId: 1,
          priority: 'high',
          marksWeightage: 12.5,
          questionWeightage: 10,
          sortOrder: 1,
        },
      },
      oneTopic: {
        summary: 'Narrow to one topic',
        value: { syllabusId: 1, subjectId: 1, topicId: 3, priority: 'medium' },
      },
      oneSubtopic: {
        summary: 'Narrow to one subtopic',
        value: {
          syllabusId: 1,
          subjectId: 1,
          topicId: 3,
          subtopicId: 7,
          priority: 'low',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Syllabus item created successfully' })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input, a topic that does not belong to the subject, a ' +
      'subtopic that does not belong to the topic, or a subtopic without a topic',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({
    status: 404,
    description: 'Syllabus, subject, topic or subtopic not found',
  })
  @ApiResponse({
    status: 409,
    description: 'This syllabus already maps that combination',
  })
  create(@Body() createDto: CreateExamSyllabusItemDto) {
    return this.itemsService.create(createDto);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-syllabus-items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List syllabus items (Admin only)',
    description:
      'Return syllabus items ordered by sortOrder ascending. The filters ' +
      'combine: pass syllabusId for one syllabus, subjectId to find every ' +
      'syllabus that maps a given subject.',
  })
  @ApiQuery({
    name: 'syllabusId',
    required: false,
    type: Number,
    example: 1,
    description:
      'Restrict to one syllabus. An unknown syllabus returns an empty list, not 404.',
  })
  @ApiQuery({
    name: 'subjectId',
    required: false,
    type: Number,
    example: 1,
    description:
      'Restrict to items mapping one subject, across every syllabus.',
  })
  @ApiResponse({
    status: 200,
    description: 'Syllabus items retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Filter IDs must be integers' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  findAll(
    @Query('syllabusId', new ParseIntPipe({ optional: true }))
    syllabusId?: number,
    @Query('subjectId', new ParseIntPipe({ optional: true }))
    subjectId?: number,
  ) {
    return this.itemsService.findAll(syllabusId, subjectId);
  }

  @Get(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-syllabus-items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get syllabus item by ID (Admin only)' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Syllabus item ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Syllabus item retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Syllabus item not found' })
  findOne(@Param('id') id: number) {
    return this.itemsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-syllabus-items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update syllabus item by ID (Admin only)',
    description:
      'All fields are optional. Send null to clear topicId or subtopicId - ' +
      'note that clearing one widens the mapping, which can collide with an ' +
      'item already mapping at that shallower depth.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Syllabus item ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateExamSyllabusItemDto,
    examples: {
      reprioritise: { summary: 'Change priority', value: { priority: 'high' } },
      weightage: {
        summary: 'Set the published weightages',
        value: { marksWeightage: 12.5, questionWeightage: 10 },
      },
      widen: {
        summary: 'Widen from a subtopic to its topic',
        value: { subtopicId: null },
      },
      reorder: { summary: 'Change display order', value: { sortOrder: 4 } },
    },
  })
  @ApiResponse({ status: 200, description: 'Syllabus item updated successfully' })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input, a broken subject/topic/subtopic chain, or a subtopic left without a topic',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({
    status: 404,
    description: 'Syllabus item, syllabus, subject, topic or subtopic not found',
  })
  @ApiResponse({
    status: 409,
    description: 'This syllabus already maps that combination',
  })
  update(
    @Param('id') id: number,
    @Body() updateDto: UpdateExamSyllabusItemDto,
  ) {
    return this.itemsService.update(+id, updateDto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-syllabus-items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete syllabus item by ID (Admin only)',
    description:
      'Permanent, not a soft delete. An item is a mapping rather than a ' +
      'record worth keeping once it leaves a syllabus, so the row is removed ' +
      'and cannot be restored.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Syllabus item ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Syllabus item permanently removed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Syllabus item not found' })
  remove(@Param('id') id: number) {
    return this.itemsService.remove(+id);
  }
}
