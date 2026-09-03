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
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('users')
@UseFilters(new HttpExceptionFilter('users'))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Create a new user',
    description:
      'Register a new user account. All fields are required except photoURL and isActive. Accounts are always created with the "user" role; admin accounts are provisioned by the seed script.',
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

  @Get('me')
  @Roles(Role.User, Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get my profile',
    description:
      'Retrieve the profile of the authenticated user, identified by the token rather than a path parameter.',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findMe(@GetUser('id') userId: number) {
    return this.usersService.findOne(userId);
  }

  @Patch('me')
  @Roles(Role.User, Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update my profile',
    description:
      'Update the profile of the authenticated user. All fields are optional.',
  })
  @ApiBody({
    type: UpdateUserDto,
    examples: {
      example1: {
        summary: 'Update own details',
        value: {
          firstName: 'John',
          lastName: 'Updated',
          phone: '9876543210',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateMe(
    @GetUser('id') userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, {
      ...updateUserDto,
      updatedBy: userId,
    });
  }

  @Delete('me')
  @Roles(Role.User, Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete my account',
    description:
      'Soft-delete the authenticated user account. No body is required - the deleter is taken from the token.',
  })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  removeMe(@GetUser('id') userId: number) {
    return this.usersService.remove(userId, { deletedBy: userId });
  }

  @Get(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'users')
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
  @Roles(Role.Admin)
  @ApiTags('admin', 'users')
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
  @Roles(Role.Admin)
  @ApiTags('admin', 'users')
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
@Roles(Role.Admin)
@ApiTags('admin', 'users')
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

  @Patch(':id/role')
  @Roles(Role.Admin)
  @ApiTags('admin', 'users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change a user role (Admin only)',
    description:
      'Assign a role to a user. This is the only route that can grant admin - registration always creates a "user".',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'User ID', example: 1 })
  @ApiBody({
    type: UpdateUserRoleDto,
    examples: {
      promote: { summary: 'Promote to admin', value: { role: 'admin' } },
      demote: { summary: 'Demote to user', value: { role: 'user' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateRole(
    @Param('id') id: number,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(+id, updateUserRoleDto.role);
  }
}
