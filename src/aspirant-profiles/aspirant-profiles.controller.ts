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
import { AspirantProfilesService } from './aspirant-profiles.service';
import { CreateAspirantProfileDto } from './dto/create-aspirant-profile.dto';
import { UpdateAspirantProfileDto } from './dto/update-aspirant-profile.dto';
import { DeleteAspirantProfileDto } from './dto/delete-aspirant-profile.dto';
import { HttpExceptionFilter } from '../shared/exception-service';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('aspirant-profiles')
@UseFilters(new HttpExceptionFilter('AspirantProfiles'))
@Controller('aspirant-profiles')
export class AspirantProfilesController {
  constructor(
    private readonly aspirantProfilesService: AspirantProfilesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create an aspirant profile',
    description:
      'Create the aspirant profile for a user. A user can have only one profile.',
  })
  @ApiBody({
    type: CreateAspirantProfileDto,
    examples: {
      example1: {
        summary: 'Create aspirant profile',
        value: {
          userId: 1,
          dateOfBirth: '1998-05-21',
          gender: 'male',
          communityCategory: 'obc',
          isKeralaNative: true,
          malayalamProficiency: 'fluent',
          preferredLanguage: 'ml',
        },
      },
      example2: {
        summary: 'Minimal aspirant profile',
        value: {
          userId: 2,
          dateOfBirth: '2001-11-02',
          gender: 'female',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Aspirant profile created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        userId: { type: 'number', example: 1 },
        dateOfBirth: { type: 'string', example: '1998-05-21' },
        gender: { type: 'string', example: 'male' },
        communityCategory: { type: 'string', example: 'obc' },
        isKeralaNative: { type: 'boolean', example: true },
        malayalamProficiency: { type: 'string', example: 'fluent' },
        preferredLanguage: { type: 'string', example: 'ml' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 409,
    description: 'Aspirant profile already exists for this user',
  })
  async create(@Body() createAspirantProfileDto: CreateAspirantProfileDto) {
    return await this.aspirantProfilesService.create(createAspirantProfileDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all aspirant profiles (Admin only)',
    description: 'Retrieve every aspirant profile that has not been deleted.',
  })
  @ApiResponse({
    status: 200,
    description: 'Aspirant profiles retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async findAll() {
    return await this.aspirantProfilesService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get the aspirant profile of the logged in user',
    description: 'Retrieve the aspirant profile of the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Aspirant profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Aspirant profile not found' })
  async findMine(@GetUser('id') userId: number) {
    return await this.aspirantProfilesService.findByUserId(userId);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get aspirant profile by user ID',
    description: 'Retrieve the aspirant profile belonging to a user.',
  })
  @ApiParam({
    name: 'userId',
    type: 'number',
    description: 'User ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Aspirant profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Aspirant profile not found' })
  async findByUser(@Param('userId') userId: string) {
    return await this.aspirantProfilesService.findByUserId(+userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get aspirant profile by ID',
    description: 'Retrieve an aspirant profile by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Aspirant profile ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Aspirant profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Aspirant profile not found' })
  async findOne(@Param('id') id: string) {
    return await this.aspirantProfilesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update aspirant profile by ID',
    description: 'Update aspirant profile information. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Aspirant profile ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateAspirantProfileDto,
    examples: {
      example1: {
        summary: 'Update language preferences',
        value: {
          malayalamProficiency: 'native',
          preferredLanguage: 'en',
          updatedBy: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Aspirant profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Update Successfull' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            userId: { type: 'number', example: 1 },
            preferredLanguage: { type: 'string', example: 'en' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Aspirant profile not found' })
  async update(
    @Param('id') id: string,
    @Body() updateAspirantProfileDto: UpdateAspirantProfileDto,
  ) {
    const data = await this.aspirantProfilesService.update(
      +id,
      updateAspirantProfileDto,
    );
    return { message: 'Update Successfull', data };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.User, Role.Admin)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete aspirant profile by ID',
    description: 'Soft delete an aspirant profile by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Aspirant profile ID',
    example: 1,
  })
  @ApiBody({
    type: DeleteAspirantProfileDto,
    examples: {
      example1: {
        summary: 'Delete aspirant profile',
        value: {
          deletedBy: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Aspirant profile deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Aspirant profile with ID 1 has been successfully removed',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Aspirant profile not found' })
  async remove(
    @Param('id') id: string,
    @Body() deleteAspirantProfileDto: DeleteAspirantProfileDto,
  ) {
    return await this.aspirantProfilesService.remove(
      +id,
      deleteAspirantProfileDto,
    );
  }
}
