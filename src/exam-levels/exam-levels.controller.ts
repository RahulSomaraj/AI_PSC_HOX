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
import { ExamLevelsService } from './exam-levels.service';
import { CreateExamLevelDto } from './dto/create-exam-level.dto';
import { UpdateExamLevelDto } from './dto/update-exam-level.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { HttpExceptionFilter } from '../shared/exception-service';

@ApiTags('exam-levels')
@UseFilters(new HttpExceptionFilter('exam-levels'))
@Controller('exam-levels')
export class ExamLevelsController {
  constructor(private readonly examLevelsService: ExamLevelsService) {}

  @Post()
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-levels')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create an exam level (Admin only)',
    description:
      'A level is the root of the exam hierarchy - the band a post is ' +
      'advertised under, grouping the posts a candidate of that standing can ' +
      'apply for.',
  })
  @ApiBody({
    type: CreateExamLevelDto,
    examples: {
      degree: {
        summary: 'Degree level',
        value: {
          name: 'Degree Level',
          description: 'Posts requiring a degree from a recognised university.',
          sortOrder: 1,
        },
      },
      plusTwo: {
        summary: 'Plus Two level',
        value: { name: 'Plus Two Level', sortOrder: 2 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Exam level created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({
    status: 409,
    description: 'An exam level with this name already exists',
  })
  create(
    @Body() createExamLevelDto: CreateExamLevelDto,
    @GetUser('id') userId: number,
  ) {
    return this.examLevelsService.create(createExamLevelDto, userId);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-levels')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List exam levels (Admin only)',
    description:
      'Return every live exam level, ordered by sortOrder ascending then ' +
      'name.',
  })
  @ApiResponse({
    status: 200,
    description: 'Exam levels retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  findAll() {
    return this.examLevelsService.findAll();
  }

  @Get(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-levels')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get exam level by ID (Admin only)' })
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
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Exam level not found' })
  findOne(@Param('id') id: number) {
    return this.examLevelsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-levels')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update exam level by ID (Admin only)',
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
      rename: { summary: 'Rename', value: { name: 'Graduate Level' } },
      reorder: { summary: 'Change display order', value: { sortOrder: 3 } },
      deactivate: { summary: 'Deactivate', value: { isActive: false } },
    },
  })
  @ApiResponse({ status: 200, description: 'Exam level updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Exam level not found' })
  @ApiResponse({
    status: 409,
    description: 'An exam level with this name already exists',
  })
  update(
    @Param('id') id: number,
    @Body() updateExamLevelDto: UpdateExamLevelDto,
    @GetUser('id') userId: number,
  ) {
    return this.examLevelsService.update(+id, updateExamLevelDto, userId);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-levels')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete exam level by ID (Admin only)',
    description:
      'Soft delete. No body is required - the deleter is taken from the ' +
      'token. Refused while live exam posts are still filed under the level; ' +
      'delete or move those first.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam level ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Exam level deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Exam level not found' })
  @ApiResponse({
    status: 409,
    description: 'Exam posts are still filed under this level',
  })
  remove(@Param('id') id: number, @GetUser('id') userId: number) {
    return this.examLevelsService.remove(+id, userId);
  }
}
