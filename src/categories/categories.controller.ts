import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from '../common/decorators/public.decorator';
import { HttpExceptionFilter } from '../shared/exception-service';
import { LoggingInterceptor } from '../interceptors/logging-interceptors';

@ApiTags('categories')
@UseFilters(new HttpExceptionFilter('Categories'))
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Post()
  @ApiOperation({ 
    summary: 'Create a new category',
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
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return await this.categoriesService.create(createCategoryDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  async findAll() {
    return await this.categoriesService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ 
    summary: 'Get category by ID',
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
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('id') id: string) {
    return await this.categoriesService.findOne(+id);
  }

  @Public()
  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update category by ID',
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
  @ApiResponse({ status: 404, description: 'Category not found' })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const data = await this.categoriesService.update(+id, updateCategoryDto);
    return { message: 'Update Successfull', data };
  }

  @Public()
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete category by ID',
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
  @ApiResponse({ status: 404, description: 'Category not found' })
  async remove(@Param('id') id: string) {
    return await this.categoriesService.remove(+id);
  }
}
