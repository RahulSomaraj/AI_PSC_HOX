import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
<<<<<<< HEAD
  ParseIntPipe,
  Patch,
  Post,
  Query,
=======
  Patch,
  Post,
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
<<<<<<< HEAD
  ApiQuery,
=======
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExamLevelsService } from './exam-levels.service';
import { CreateExamLevelDto } from './dto/create-exam-level.dto';
import { UpdateExamLevelDto } from './dto/update-exam-level.dto';
<<<<<<< HEAD
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
import { toOptionalBoolean } from '../common/utils/query.util';

@ApiTags('exam-levels')
@UseFilters(new HttpExceptionFilter('ExamLevels'))
=======
import { HttpExceptionFilter } from '../shared/exception-service';

@ApiTags('exam-levels')
@UseFilters(new HttpExceptionFilter('exam-levels'))
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
@Controller('exam-levels')
export class ExamLevelsController {
  constructor(private readonly examLevelsService: ExamLevelsService) {}

  @Post()
<<<<<<< HEAD
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
=======
  @Roles(Role.Admin)
  @ApiTags('admin', 'exam-levels')
  @UseGuards(JwtAuthGuard, RolesGuard)
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create an exam level (Admin only)',
    description:
<<<<<<< HEAD
      'Create a qualification band such as "Degree Level". Level names must be unique.',
=======
      'A level is the root of the exam hierarchy - the band a post is ' +
      'advertised under, grouping the posts a candidate of that standing can ' +
      'apply for.',
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  })
  @ApiBody({
    type: CreateExamLevelDto,
    examples: {
<<<<<<< HEAD
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
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Exam level created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
<<<<<<< HEAD
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
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  })
  @ApiResponse({
    status: 200,
    description: 'Exam levels retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
<<<<<<< HEAD
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
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
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
<<<<<<< HEAD
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
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
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
<<<<<<< HEAD
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
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Exam level ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Exam level deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
<<<<<<< HEAD
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
=======
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Exam level not found' })
  @ApiResponse({
    status: 409,
    description: 'Exam posts are still filed under this level',
  })
  remove(@Param('id') id: number, @GetUser('id') userId: number) {
    return this.examLevelsService.remove(+id, userId);
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  }
}
