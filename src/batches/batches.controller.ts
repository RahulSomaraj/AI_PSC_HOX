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
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
<<<<<<< HEAD
import { UpdateBatchStatusDto } from './dto/update-batch-status.dto';
import { HttpExceptionFilter } from '../shared/exception-service';
=======
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
<<<<<<< HEAD
import { BatchMode } from '../common/enums/batch-mode.enum';
import { BatchStatus } from '../common/enums/batch-status.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { toOptionalEnum, toOptionalNumber } from '../common/utils/query.util';

/**
 * Batches are the admin-facing cohort list: name, target exam, mode, head
 * count, dates and status. Routes are ordered so `:id/status` is matched
 * before the bare `:id` patterns.
 */
@ApiTags('batches')
@UseFilters(new HttpExceptionFilter('Batches'))
=======
import { GetUser } from '../common/decorators/get-user.decorator';
import { HttpExceptionFilter } from '../shared/exception-service';

@ApiTags('batches')
@UseFilters(new HttpExceptionFilter('batches'))
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
<<<<<<< HEAD
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
=======
  @Roles(Role.Admin)
  @ApiTags('admin', 'batches')
  @UseGuards(JwtAuthGuard, RolesGuard)
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a batch (Admin only)',
    description:
<<<<<<< HEAD
      'Creates a coaching batch for one exam / post. The batch name must be free among the batches that have not been deleted.',
=======
      'A batch is a named group of students sitting a shift, shown as "Batch A (Morning)" on the students screen.',
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  })
  @ApiBody({
    type: CreateBatchDto,
    examples: {
<<<<<<< HEAD
      example1: {
        summary: 'Online batch',
        value: {
          name: 'Alpha Batch 2025',
          examId: 1,
          mode: 'online',
          studentCount: 120,
          startDate: '2025-01-01',
          endDate: '2025-12-01',
          status: 'active',
        },
      },
      example2: {
        summary: 'Minimal batch',
        value: {
          name: 'Winter Batch 2025',
          examId: 2,
          mode: 'hybrid',
          startDate: '2025-11-14',
          endDate: '2026-11-14',
        },
=======
      morning: {
        summary: 'Morning batch',
        value: { name: 'Batch A', shift: 'Morning' },
      },
      evening: {
        summary: 'Evening batch',
        value: { name: 'Batch B', shift: 'Evening' },
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Batch created successfully' })
<<<<<<< HEAD
  @ApiResponse({
    status: 400,
    description: 'Invalid input, or endDate is before startDate',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  @ApiResponse({ status: 409, description: 'A batch with that name exists' })
  async create(
    @Body() createBatchDto: CreateBatchDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.batchesService.create(createBatchDto, actorId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List batches',
    description:
      'Paginated, ordered by start date. Returns items plus the total count before paging, which is what the list footer needs. Filter by exam, mode or status, and search on the batch name.',
  })
  @ApiQuery({ name: 'examId', required: false, type: 'number' })
  @ApiQuery({ name: 'mode', required: false, enum: BatchMode })
  @ApiQuery({ name: 'status', required: false, enum: BatchStatus })
  @ApiQuery({
    name: 'search',
    required: false,
    type: 'string',
    description: 'Case-insensitive match on the batch name',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'number',
    description: '1-based page number (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Rows per page (default 10, capped at 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Batches retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'object' } },
        total: { type: 'number', example: 24 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        totalPages: { type: 'number', example: 3 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameter' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('examId') examId?: string,
    @Query('mode') mode?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.batchesService.findAll({
      examId: toOptionalNumber(examId, 'examId'),
      mode: toOptionalEnum(mode, 'mode', BatchMode),
      status: toOptionalEnum(status, 'status', BatchStatus),
      search,
      page: toOptionalNumber(page, 'page'),
      limit: toOptionalNumber(limit, 'limit'),
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a batch by ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'Batch ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Batch retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.batchesService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change the status of a batch (Admin only)',
    description:
      'Sets the batch status without touching any other field - the action behind the status control in the list.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Batch ID', example: 1 })
  @ApiBody({
    type: UpdateBatchStatusDto,
    examples: {
      activate: { summary: 'Mark active', value: { status: 'active' } },
      deactivate: { summary: 'Mark inactive', value: { status: 'inactive' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Batch status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBatchStatusDto: UpdateBatchStatusDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.batchesService.setStatus(
      id,
      updateBatchStatusDto.status,
      actorId,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a batch (Admin only)',
=======
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({
    status: 409,
    description: 'A batch with this name already exists in this shift',
  })
  create(@Body() createBatchDto: CreateBatchDto, @GetUser('id') userId: number) {
    return this.batchesService.create(createBatchDto, userId);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiTags('admin', 'batches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List batches (Admin only)',
    description:
      'Return every live batch, ordered by name then shift. Backs the "All Batches" filter on the students screen.',
  })
  @ApiResponse({ status: 200, description: 'Batches retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  findAll() {
    return this.batchesService.findAll();
  }

  @Get(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'batches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get batch by ID (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Batch ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Batch retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  findOne(@Param('id') id: number) {
    return this.batchesService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'batches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update batch by ID (Admin only)',
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
    description: 'All fields are optional.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Batch ID', example: 1 })
  @ApiBody({
    type: UpdateBatchDto,
    examples: {
<<<<<<< HEAD
      example1: {
        summary: 'Correct the head count and end date',
        value: { studentCount: 130, endDate: '2026-01-31' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Batch updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input, or endDate is before startDate',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Batch or exam not found' })
  @ApiResponse({ status: 409, description: 'A batch with that name exists' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBatchDto: UpdateBatchDto,
    @GetUser('id') actorId: number,
  ) {
    return await this.batchesService.update(id, updateBatchDto, actorId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a batch (Admin only)',
    description:
      'Soft delete. The name is freed for reuse once the batch is deleted.',
=======
      rename: { summary: 'Rename', value: { name: 'Batch C' } },
      moveShift: { summary: 'Move to another shift', value: { shift: 'Evening' } },
      deactivate: { summary: 'Deactivate', value: { isActive: false } },
    },
  })
  @ApiResponse({ status: 200, description: 'Batch updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  @ApiResponse({
    status: 409,
    description: 'A batch with this name already exists in this shift',
  })
  update(
    @Param('id') id: number,
    @Body() updateBatchDto: UpdateBatchDto,
    @GetUser('id') userId: number,
  ) {
    return this.batchesService.update(+id, updateBatchDto, userId);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'batches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete batch by ID (Admin only)',
    description:
      'Soft delete. No body is required - the deleter is taken from the token.',
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Batch ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Batch deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
<<<<<<< HEAD
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') actorId: number,
  ) {
    return await this.batchesService.remove(id, actorId);
=======
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  remove(@Param('id') id: number, @GetUser('id') userId: number) {
    return this.batchesService.remove(+id, userId);
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  }
}
