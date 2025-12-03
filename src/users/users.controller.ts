import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { HttpExceptionFilter } from '../shared/exception-service';
import { Public } from '../common/decorators/public.decorator';
import { DeleteUserDto } from './dto/delete-user.dto';

@ApiTags('users')
@UseFilters(new HttpExceptionFilter('users'))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  @ApiOperation({ 
    summary: 'Create a new user',
    description: 'Register a new user account. All fields are required except photoURL, role, createdBy, and isActive.',
  })
  @ApiBody({ 
    type: CreateUserDto,
    examples: {
      example1: {
        summary: 'Create regular user',
        value: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '9876543210',
          password: 'SecurePass123!',
          role: 'user',
        },
      },
      example2: {
        summary: 'Create admin user',
        value: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '9876543211',
          password: 'AdminPass123!',
          role: 'admin',
          photoURL: 'https://example.com/photos/jane.jpg',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User created successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            email: { type: 'string', example: 'john.doe@example.com' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  @Roles(Role.User,Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get user by ID',
    description: 'Retrieve user information by user ID. Requires authentication.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'User ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        email: { type: 'string', example: 'john.doe@example.com' },
        phone: { type: 'string', example: '9876543210' },
        role: { type: 'string', example: 'user' },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: number) {
    return this.usersService.findOne(+id);
  }

  @Get()
  @Roles(Role.User,Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get all users',
    description: 'Retrieve a list of all users. Requires authentication.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of users returned successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          email: { type: 'string', example: 'john.doe@example.com' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id')
  @Roles(Role.User,Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update user by ID',
    description: 'Update user information. All fields are optional.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'User ID', example: 1 })
  @ApiBody({ 
    type: UpdateUserDto,
    examples: {
      example1: {
        summary: 'Update user details',
        value: {
          firstName: 'John',
          lastName: 'Updated',
          phone: '9876543210',
          photoURL: 'https://example.com/photos/john.jpg',
        },
      },
      example2: {
        summary: 'Deactivate user',
        value: {
          isActive: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            firstName: { type: 'string', example: 'John' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

@Delete(':id')
@Roles(Role.User,Role.Admin)
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@ApiOperation({ 
  summary: 'Delete user by ID',
  description: 'Delete a user account. Requires password confirmation in the request body.',
})
@ApiParam({ name: 'id', type: 'number', description: 'User ID', example: 1 })
@ApiBody({ 
  type: DeleteUserDto,
  examples: {
    example1: {
      summary: 'Delete user',
      value: {
        deletedBy: 1,
      },
    },
  },
})
@ApiResponse({ 
  status: 200, 
  description: 'User deleted successfully',
  schema: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'User deleted successfully' },
    },
  },
})
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 404, description: 'User not found' })
remove(@Param('id') id: number, @Body() deleteUserDto: DeleteUserDto) {
  return this.usersService.remove(+id, deleteUserDto);
}
}
