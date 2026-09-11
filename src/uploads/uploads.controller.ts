import { Body, Controller, Post, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { HttpExceptionFilter } from '../shared/exception-service';
import { UploadsService } from './uploads.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { UploadUrlDto } from './dto/upload-url.dto';

@ApiTags('uploads')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Authentication required' })
@ApiResponse({ status: 403, description: 'Admin or staff access required' })
@UseGuards(JwtAuthGuard, RolesGuard)
// Staff are included because Content Library entries are authored by faculty.
// Note that Role.Staff currently gates nothing else in this API - see
// CLAUDE.md D5; if that decision lands differently, this line changes with it.
@Roles(Role.Admin, Role.Staff)
@UseFilters(new HttpExceptionFilter('Uploads'))
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @ApiOperation({
    summary: 'Get a presigned URL to upload one file directly to storage',
    description:
      'PUT the bytes to `uploadUrl` with exactly the headers in `requiredHeaders`, then send `fileUrl` on the create call the file belongs to. The URL is single use and short lived.',
  })
  @ApiResponse({ status: 201, type: UploadUrlDto })
  @ApiResponse({ status: 413, description: 'File is larger than the limit for this purpose' })
  @ApiResponse({ status: 415, description: 'Content type not accepted for this purpose' })
  @ApiResponse({ status: 503, description: 'File storage is not configured' })
  create(@Body() dto: CreateUploadUrlDto): Promise<UploadUrlDto> {
    return this.uploadsService.createUploadUrl(dto);
  }
}
