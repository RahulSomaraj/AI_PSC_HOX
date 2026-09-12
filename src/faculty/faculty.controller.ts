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
import { FacultyService } from './faculty.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { UpdateFacultyDto } from './dto/update-faculty.dto';
import { FindFacultyQueryDto } from './dto/find-faculty-query.dto';
import { FacultyStatusDto } from './dto/faculty-status.dto';
import { FacultyContributionsDto } from './dto/faculty-contributions.dto';

@ApiTags('faculty', 'admin')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Authentication required' })
@ApiResponse({ status: 403, description: 'Admin access required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@UseFilters(new HttpExceptionFilter('Faculty'))
@Controller('faculty')
export class FacultyController {
  constructor(private readonly facultyService: FacultyService) {}

  @Post()
  @ApiOperation({
    summary: 'Add faculty or staff and create their staff login account',
  })
  @ApiResponse({ status: 201, description: 'Faculty member created' })
  @ApiResponse({
    status: 409,
    description: 'Email already belongs to a live account',
  })
  create(@Body() dto: CreateFacultyDto, @GetUser('id') actorId: number) {
    return this.facultyService.create(dto, actorId);
  }

  @Get()
  @ApiOperation({ summary: 'List faculty with search, filters and pagination' })
  findAll(@Query() query: FindFacultyQueryDto) {
    return this.facultyService.findAll(query);
  }

  @Get('options')
  @ApiOperation({
    summary:
      'Get subjects, batches, roles and statuses for faculty forms and filters',
  })
  options() {
    return this.facultyService.options();
  }

  @Get(':id')
  @ApiOperation({ summary: 'View a faculty member' })
  @ApiResponse({ status: 404, description: 'Faculty member not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.facultyService.findOne(id);
  }

  @Get(':id/contributions')
  @ApiOperation({
    summary: 'Count what a faculty member has authored',
    description:
      'Questions and content library items written by their staff account.',
  })
  @ApiResponse({ status: 200, type: FacultyContributionsDto })
  @ApiResponse({ status: 404, description: 'Faculty member not found' })
  contributions(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<FacultyContributionsDto> {
    return this.facultyService.contributions(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary:
      'Activate or deactivate faculty; deactivation revokes existing sessions',
  })
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FacultyStatusDto,
    @GetUser('id') actorId: number,
  ) {
    return this.facultyService.setStatus(id, dto.isActive, actorId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit faculty details, job role, subject and batch assignments',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already belongs to a live account',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFacultyDto,
    @GetUser('id') actorId: number,
  ) {
    return this.facultyService.update(id, dto, actorId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Soft-delete faculty and their account, and revoke sessions',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') actorId: number,
  ) {
    return this.facultyService.remove(id, actorId);
  }
}
