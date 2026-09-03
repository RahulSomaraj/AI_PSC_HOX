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
import { SyllabusService } from './syllabus.service';
import { CreateSyllabusDto } from './dto/create-syllabus.dto';
import { UpdateSyllabusDto } from './dto/update-syllabus.dto';
import { CreateSyllabusItemDto } from './dto/create-syllabus-item.dto';
import { CreateSyllabusMappingDto } from './dto/create-syllabus-mapping.dto';
import { UpdateSyllabusItemDto } from './dto/update-syllabus-item.dto';
import { ReorderDto } from '../common/dto/reorder.dto';
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
 * The syllabus joins an exam stage to the global academic structure. Routes
 * are ordered so the literal segments (`mappings`, `stage`, `exam`,
 * `reorder`) are matched before the `:id` patterns.
 */
@ApiTags('syllabus')
@UseFilters(new HttpExceptionFilter('Syllabus'))
@Controller('syllabus')
export class SyllabusController {
  constructor(private readonly syllabusService: SyllabusService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create the syllabus of an exam stage (Admin only)',
    description:
      'One syllabus per stage. The stage must belong to the given exam.',
  })
  @ApiBody({
    type: CreateSyllabusDto,
    examples: {
      example1: {
        summary: 'SI prelims syllabus',
        value: {
          examId: 1,
          examStageId: 1,
          title: 'SI of Police - Preliminary Examination Syllabus',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Syllabus created successfully' })
  @ApiResponse({
    status: 400,
    description: 'The stage does not belong to the exam',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Exam or exam stage not found' })
  @ApiResponse({ status: 409, description: 'The stage already has a syllabus' })
  async create(
    @Body() createSyllabusDto: CreateSyllabusDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.syllabusService.create(createSyllabusDto, actorId);
  }

  @Post('mappings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Map academic content onto an exam stage (Admin only)',
    description:
      'Adds a subject, a topic or a subtopic straight onto an exam stage, creating the stage syllabus on first use. Send the subject alone for the whole subject, add topicId to narrow it down, add subtopicId for a single subtopic.',
  })
  @ApiBody({
    type: CreateSyllabusMappingDto,
    examples: {
      wholeSubject: {
        summary: 'Map the whole subject',
        value: { examId: 1, examStageId: 1, subjectId: 1, priority: 'high' },
      },
      oneTopic: {
        summary: 'Map one topic',
        value: { examId: 1, examStageId: 1, subjectId: 1, topicId: 4 },
      },
      oneSubtopic: {
        summary: 'Map one subtopic',
        value: {
          examId: 1,
          examStageId: 1,
          subjectId: 1,
          topicId: 4,
          subtopicId: 9,
          priority: 'high',
          marksWeightage: 2,
          questionWeightage: 2,
          sortOrder: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Mapping created successfully' })
  @ApiResponse({
    status: 400,
    description:
      'Invalid combination - the stage is not part of the exam, the topic is not part of the subject, or the subtopic is not part of the topic',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'A referenced record was not found',
  })
  @ApiResponse({
    status: 409,
    description: 'The combination is already mapped',
  })
  async addMapping(
    @Body() createSyllabusMappingDto: CreateSyllabusMappingDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.syllabusService.addMapping(
      createSyllabusMappingDto,
      actorId,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List syllabi' })
  @ApiQuery({ name: 'examId', required: false, type: 'number' })
  @ApiQuery({ name: 'examStageId', required: false, type: 'number' })
  @ApiQuery({ name: 'isActive', required: false, type: 'boolean' })
  @ApiResponse({ status: 200, description: 'Syllabi retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('examId') examId?: string,
    @Query('examStageId') examStageId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return await this.syllabusService.findAll({
      examId: toOptionalNumber(examId, 'examId'),
      examStageId: toOptionalNumber(examStageId, 'examStageId'),
      isActive: toOptionalBoolean(isActive, 'isActive'),
    });
  }

  @Get('stage/:examStageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get the complete syllabus of an exam stage',
    description:
      'Returns the exam, the stage and the mapped content nested as subject -> topic -> subtopic.',
  })
  @ApiParam({
    name: 'examStageId',
    type: 'number',
    description: 'Exam stage ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Syllabus retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        exam: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Sub Inspector of Police' },
          },
        },
        stage: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Preliminary Examination' },
          },
        },
        subjects: {
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
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'The stage has no syllabus' })
  async findByStage(@Param('examStageId', ParseIntPipe) examStageId: number) {
    return await this.syllabusService.getTreeByStage(examStageId);
  }

  @Get('exam/:examId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get the syllabus of every stage of an exam',
    description:
      'One nested syllabus per stage, in the order the stages are held.',
  })
  @ApiParam({
    name: 'examId',
    type: 'number',
    description: 'Exam ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Syllabi retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async findByExam(@Param('examId', ParseIntPipe) examId: number) {
    return await this.syllabusService.getTreesByExam(examId);
  }

  @Get(':id/tree')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get a syllabus as a nested tree',
    description: 'Same shape as GET /syllabus/stage/{examStageId}.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Syllabus ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Syllabus retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Syllabus not found' })
  async getTree(@Param('id', ParseIntPipe) id: number) {
    return await this.syllabusService.getTree(id);
  }

  @Get(':id/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List the items of a syllabus',
    description:
      'The flat mapping rows, with the subject, topic and subtopic joined.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Syllabus ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Syllabus items retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Syllabus not found' })
  async findItems(@Param('id', ParseIntPipe) id: number) {
    return await this.syllabusService.findItems(id);
  }

  @Post(':id/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Add a subject, topic or subtopic to a syllabus (Admin only)',
    description:
      'The combination is validated against the academic tree and rejected if it is already mapped.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Syllabus ID',
    example: 1,
  })
  @ApiBody({
    type: CreateSyllabusItemDto,
    examples: {
      wholeSubject: {
        summary: 'Add the whole subject',
        value: { subjectId: 1, priority: 'high' },
      },
      oneTopic: {
        summary: 'Add one topic',
        value: { subjectId: 1, topicId: 4 },
      },
      oneSubtopic: {
        summary: 'Add one subtopic',
        value: { subjectId: 1, topicId: 4, subtopicId: 9, priority: 'high' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Syllabus item added successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid subject/topic/subtopic combination',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'A referenced record was not found',
  })
  @ApiResponse({
    status: 409,
    description: 'The combination is already mapped',
  })
  async addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() createSyllabusItemDto: CreateSyllabusItemDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.syllabusService.addItem(
      id,
      createSyllabusItemDto,
      actorId,
    );
  }

  @Patch(':id/items/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reorder the items of a syllabus (Admin only)',
    description: 'Applies the whole new ordering in one transaction.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Syllabus ID',
    example: 1,
  })
  @ApiBody({
    type: ReorderDto,
    examples: {
      example1: {
        summary: 'Reorder two items',
        value: {
          items: [
            { id: 5, sortOrder: 1 },
            { id: 3, sortOrder: 2 },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Syllabus items reordered successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'An item does not belong to the syllabus, or an ID is repeated',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Syllabus not found' })
  async reorderItems(
    @Param('id', ParseIntPipe) id: number,
    @Body() reorderDto: ReorderDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.syllabusService.reorderItems(id, reorderDto, actorId);
  }

  @Patch(':id/items/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Update priority, weightage or ordering of a syllabus item (Admin only)',
    description:
      'To point an item at different academic content, remove it and add the new one.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Syllabus ID',
    example: 1,
  })
  @ApiParam({
    name: 'itemId',
    type: 'number',
    description: 'Syllabus item ID',
    example: 5,
  })
  @ApiBody({
    type: UpdateSyllabusItemDto,
    examples: {
      example1: {
        summary: 'Set the weightage',
        value: {
          priority: 'high',
          marksWeightage: 12.5,
          questionWeightage: 10,
          sortOrder: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Syllabus item updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Syllabus or item not found' })
  async updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() updateSyllabusItemDto: UpdateSyllabusItemDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.syllabusService.updateItem(
      id,
      itemId,
      updateSyllabusItemDto,
      actorId,
    );
  }

  @Delete(':id/items/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove one item from a syllabus (Admin only)',
    description:
      'Removes the mapping only. The subject, topic and subtopic stay available to every other exam.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Syllabus ID',
    example: 1,
  })
  @ApiParam({
    name: 'itemId',
    type: 'number',
    description: 'Syllabus item ID',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Syllabus item removed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Syllabus or item not found' })
  async removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return await this.syllabusService.removeItem(id, itemId);
  }

  @Delete(':id/subjects/:subjectId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove a subject from a syllabus (Admin only)',
    description:
      'Removes the subject item and every topic and subtopic item mapped under it, for this syllabus only.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Syllabus ID',
    example: 1,
  })
  @ApiParam({
    name: 'subjectId',
    type: 'number',
    description: 'Subject ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Subject removed from the syllabus',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Syllabus not found, or the subject is not mapped',
  })
  async removeSubject(
    @Param('id', ParseIntPipe) id: number,
    @Param('subjectId', ParseIntPipe) subjectId: number,
  ) {
    return await this.syllabusService.removeSubject(id, subjectId);
  }

  @Delete(':id/topics/:topicId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove a topic from a syllabus (Admin only)',
    description:
      'Removes the topic item and every subtopic item mapped under it, for this syllabus only.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Syllabus ID',
    example: 1,
  })
  @ApiParam({
    name: 'topicId',
    type: 'number',
    description: 'Topic ID',
    example: 4,
  })
  @ApiResponse({ status: 200, description: 'Topic removed from the syllabus' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Syllabus not found, or the topic is not mapped',
  })
  async removeTopic(
    @Param('id', ParseIntPipe) id: number,
    @Param('topicId', ParseIntPipe) topicId: number,
  ) {
    return await this.syllabusService.removeTopic(id, topicId);
  }

  @Delete(':id/subtopics/:subtopicId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove a subtopic from a syllabus (Admin only)',
    description: 'Removes the subtopic item, for this syllabus only.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Syllabus ID',
    example: 1,
  })
  @ApiParam({
    name: 'subtopicId',
    type: 'number',
    description: 'Subtopic ID',
    example: 9,
  })
  @ApiResponse({
    status: 200,
    description: 'Subtopic removed from the syllabus',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Syllabus not found, or the subtopic is not mapped',
  })
  async removeSubtopic(
    @Param('id', ParseIntPipe) id: number,
    @Param('subtopicId', ParseIntPipe) subtopicId: number,
  ) {
    return await this.syllabusService.removeSubtopic(id, subtopicId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get a syllabus by ID',
    description: 'The syllabus with its exam, stage and flat item list.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Syllabus ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Syllabus retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Syllabus not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const syllabus = await this.syllabusService.findOne(id);
    const items = await this.syllabusService.findItems(id);
    return { ...syllabus, items };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a syllabus (Admin only)',
    description:
      'Title, description and status only - the exam and stage are fixed once the syllabus exists.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Syllabus ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateSyllabusDto,
    examples: {
      example1: {
        summary: 'Retitle',
        value: { title: 'SI of Police - Prelims (2025 notification)' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Syllabus updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Syllabus not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSyllabusDto: UpdateSyllabusDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.syllabusService.update(id, updateSyllabusDto, actorId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a syllabus (Admin only)',
    description:
      'Soft-deletes the syllabus and removes its mapping rows. The academic content itself is untouched.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Syllabus ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Syllabus deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Syllabus not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') actorId: number,
  ) {
    return await this.syllabusService.remove(id, actorId);
  }
}
