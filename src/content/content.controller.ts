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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Role } from '../common/enums/role.enum';
import { HttpExceptionFilter } from '../shared/exception-service';
import { ContentService, Viewer } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { FindContentQueryDto } from './dto/find-content-query.dto';

/**
 * Builds the viewer a read is narrowed by.
 *
 * Taken from the token, never from a parameter - it is the only thing
 * standing between a student and another batch's material.
 */
const viewerOf = (user: { userId: number; roles?: unknown }): Viewer => {
  const roles = Array.isArray(user.roles) ? user.roles : [user.roles];
  const named = roles.map((role) => String(role).toLowerCase());
  return {
    userId: user.userId,
    isStaff: named.includes(Role.Admin) || named.includes(Role.Staff),
  };
};

// No class-level @Roles: RolesGuard falls back to class metadata, and one
// here would lock students out of the library entirely. Writes carry their
// own; reads are open to any authenticated user and narrowed in the service.
@ApiTags('content')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Authentication required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(new HttpExceptionFilter('Content'))
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @Roles(Role.Admin, Role.Staff)
  @ApiOperation({ summary: 'Add an item to the content library' })
  @ApiResponse({ status: 201, description: 'Content created' })
  @ApiResponse({
    status: 400,
    description: 'Taxonomy or source is inconsistent',
  })
  @ApiResponse({ status: 403, description: 'Admin or staff access required' })
  @ApiResponse({
    status: 404,
    description: 'Subject, topic, subtopic or batch not found',
  })
  create(@Body() dto: CreateContentDto, @GetUser('id') actorId: number) {
    return this.contentService.create(dto, actorId);
  }

  @Get()
  @ApiOperation({
    summary: 'List library items',
    description:
      'Staff see everything. A student sees published items that are either attached to no batch or attached to theirs.',
  })
  findAll(@Query() query: FindContentQueryDto, @GetUser() user: any) {
    return this.contentService.findAll(query, viewerOf(user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'View one library item' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: any) {
    return this.contentService.findOne(id, viewerOf(user));
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Staff)
  @ApiOperation({
    summary: 'Update a library item, or publish it',
    description:
      'Send `batchIds` to replace the attached batches outright; omit it to leave them alone. Send `[]` to make the item visible to every student.',
  })
  @ApiResponse({ status: 403, description: 'Admin or staff access required' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContentDto,
    @GetUser('id') actorId: number,
  ) {
    return this.contentService.update(id, dto, actorId);
  }

  @Delete(':id')
  @Roles(Role.Admin, Role.Staff)
  @ApiOperation({ summary: 'Remove a library item' })
  @ApiResponse({ status: 403, description: 'Admin or staff access required' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') actorId: number,
  ) {
    return this.contentService.remove(id, actorId);
  }
}
