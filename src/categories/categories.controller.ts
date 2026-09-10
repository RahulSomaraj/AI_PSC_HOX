import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { HttpExceptionFilter } from '../shared/exception-service';

@ApiTags('categories')
@UseFilters(new HttpExceptionFilter('Categories'))
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin', 'categories')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new category (Admin only)',
    description: 'Create a new question category',
  })
  @ApiBody({ 
    type: CreateCategoryDto,
    examples: {
      example1: {
        summary: 'Create geography category',
        value: {
          name: 'Geography',
          description: 'Questions related to geography, countries, and capitals',
        },
      },
      example2: {
        summary: 'Create history category',
        value: {
          name: 'History',
          description: 'Questions about historical events and figures',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Geography' },
        description: { type: 'string', example: 'Questions related to geography' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return await this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin', 'categories')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all categories (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  async findAll() {
    return await this.categoriesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin', 'categories')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get category by ID (Admin only)',
    description: 'Retrieve a category by its ID',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Category ID', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Geography' },
        description: { type: 'string', example: 'Questions related to geography' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('id') id: string) {
    return await this.categoriesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin', 'categories')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update category by ID (Admin only)',
    description: 'Update category information. All fields are optional.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Category ID', example: '1' })
  @ApiBody({ 
    type: UpdateCategoryDto,
    examples: {
      example1: {
        summary: 'Update category',
        value: {
          name: 'Updated Geography',
          description: 'Updated description',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Update Successfull' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Updated Geography' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const data = await this.categoriesService.update(+id, updateCategoryDto);
    return { message: 'Update Successfull', data };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin', 'categories')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete category by ID (Admin only)',
    description: 'Delete a category by its ID',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Category ID', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Category deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async remove(@Param('id') id: string) {
    return await this.categoriesService.remove(+id);
  }
}
