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
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { HttpExceptionFilter } from '../shared/exception-service';

@ApiTags('batches')
@UseFilters(new HttpExceptionFilter('batches'))
@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
  @Roles(Role.Admin)
  @ApiTags('admin', 'batches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a batch (Admin only)',
    description:
      'A batch is a named group of students sitting a shift, shown as "Batch A (Morning)" on the students screen.',
  })
  @ApiBody({
    type: CreateBatchDto,
    examples: {
      morning: {
        summary: 'Morning batch',
        value: { name: 'Batch A', shift: 'Morning' },
      },
      evening: {
        summary: 'Evening batch',
        value: { name: 'Batch B', shift: 'Evening' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Batch created successfully' })
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
    description: 'All fields are optional.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Batch ID', example: 1 })
  @ApiBody({
    type: UpdateBatchDto,
    examples: {
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
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Batch ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Batch deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  remove(@Param('id') id: number, @GetUser('id') userId: number) {
    return this.batchesService.remove(+id, userId);
  }
}
