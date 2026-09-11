import { Controller, Get, UseFilters, UseGuards } from '@nestjs/common';
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
import { SettingsService } from './settings.service';
import { RoleOptionDto } from './dto/role-option.dto';

@ApiTags('settings', 'admin')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Authentication required' })
@ApiResponse({ status: 403, description: 'Admin access required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@UseFilters(new HttpExceptionFilter('Settings'))
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('roles')
  @ApiOperation({
    summary: 'List the faculty roles an admin can assign',
    description:
      'The job titles on a faculty record - not account permissions, which are the `user`/`admin`/`staff` roles on the JWT.',
  })
  @ApiResponse({ status: 200, type: [RoleOptionDto] })
  roles(): readonly RoleOptionDto[] {
    return this.settingsService.roles();
  }
}
