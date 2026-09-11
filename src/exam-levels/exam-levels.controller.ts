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
import { ExamLevelsService } from './exam-levels.service';
import { CreateExamLevelDto } from './dto/create-exam-level.dto';
import { UpdateExamLevelDto } from './dto/update-exam-level.dto';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { HttpExceptionFilter } from '../shared/exception-service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { toOptionalBoolean } from '../common/utils/query.util';

@ApiTags('exam-levels')
@UseFilters(new HttpExceptionFilter('ExamLevels'))
@Controller('exam-levels')
export class ExamLevelsController {
  constructor(private readonly examLevelsService: ExamLevelsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create an exam level (Admin only)',
    description:
      'Create a qualification band such as "Degree Level". Level names must be unique.',
  })
  @ApiBody({
    type: CreateExamLevelDto,
    examples: {
      example1: {
        summary: 'Degree level',
        value: {
          name: 'Degree Level',
          description: 'Posts that require a bachelor degree',
          sortOrder: 3,
        },
      },
      example2: {
        summary: 'Minimal',
        value: { name: '10th Level' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Exam level created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 409, description: 'Exam level already exists' })
  async create(
    @Body() createExamLevelDto: CreateExamLevelDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.examLevelsService.create(createExamLevelDto, actorId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List exam levels',
    description: 'Ordered by sortOrder, then name.',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: 'boolean',
    description: 'Only active or only inactive levels',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: 'string',
    description: 'Case-insensitive match on the level name',
  })
  @ApiResponse({
    status: 200,
    description: 'Exam levels retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return await this.examLevelsService.findAll({
      isActive: toOptionalBoolean(isActive, 'isActive'),
      search,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get exam level by ID' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam level ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Exam level retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Exam level not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.examLevelsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Activate or deactivate an exam level (Admin only)',
    description:
      'Deactivating a level hides it from listings without deleting it.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam level ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateStatusDto,
    examples: {
      example1: { summary: 'Deactivate', value: { isActive: false } },
    },
  })
  @ApiResponse({ status: 200, description: 'Exam level status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Exam level not found' })
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.examLevelsService.setStatus(
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
    summary: 'Update an exam level (Admin only)',
    description: 'All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam level ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateExamLevelDto,
    examples: {
      example1: {
        summary: 'Rename and reorder',
        value: { name: 'Degree Level', sortOrder: 2 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Exam level updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Exam level not found' })
  @ApiResponse({
    status: 409,
    description: 'Another exam level uses that name',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateExamLevelDto: UpdateExamLevelDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.examLevelsService.update(id, updateExamLevelDto, actorId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete an exam level (Admin only)',
    description:
      'Soft delete. Refused while exams still belong to the level, so the hierarchy cannot be broken.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam level ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Exam level deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Exam level not found' })
  @ApiResponse({ status: 409, description: 'Exam level still has exams' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') actorId: number,
  ) {
    return await this.examLevelsService.remove(id, actorId);
  }
}
