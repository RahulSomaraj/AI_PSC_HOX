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
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { UpdateBatchStatusDto } from './dto/update-batch-status.dto';
import { HttpExceptionFilter } from '../shared/exception-service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
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
@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a batch (Admin only)',
    description:
      'Creates a coaching batch for one exam / post. The batch name must be free among the batches that have not been deleted.',
  })
  @ApiBody({
    type: CreateBatchDto,
    examples: {
      example1: {
        summary: 'Online batch',
        value: {
          name: 'Alpha Batch 2025',
          targetExamId: 1,
          timings: '10:00 AM - 12:00 PM',
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
          targetExamId: 2,
          mode: 'hybrid',
          startDate: '2025-11-14',
          endDate: '2026-11-14',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Batch created successfully' })
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
      'Ordered by start date. Without `page`, a plain array of every match - what the console reads. With `page`, one page as { data, total, page, limit, totalPages }. Filter by exam, mode or status, and search on the batch name.',
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
    description:
      '1-based page number. Send it to get one page back; omit it for the full array.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description:
      'Rows per page when `page` is sent (default 10, capped at 100)',
  })
  @ApiResponse({
    status: 200,
    description:
      'A plain array of batches, or - when `page` is sent - one page of them.',
    schema: {
      oneOf: [
        { type: 'array', items: { type: 'object' } },
        {
          type: 'object',
          properties: {
            data: { type: 'array', items: { type: 'object' } },
            total: { type: 'number', example: 24 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 3 },
          },
        },
      ],
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
    description: 'All fields are optional.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Batch ID', example: 1 })
  @ApiBody({
    type: UpdateBatchDto,
    examples: {
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
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Batch ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Batch deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  }
}
