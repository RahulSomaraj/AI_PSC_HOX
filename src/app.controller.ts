import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments/enrollments.service';
import { JwtAuthGuard } from './auth/guards/jwt.auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './common/decorators/roles.decorator';
import { Role } from './common/enums/role.enum';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiTags('admin', 'app')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get dashboard statistics (Admin only)',
    description: 'Retrieve dashboard statistics including enrollment counts, course statistics, and user statistics. Requires admin role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Dashboard statistics retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            totalEnrollments: { type: 'number', example: 100 },
            byStatus: {
              type: 'object',
              properties: {
                active: { type: 'number', example: 50 },
                completed: { type: 'number', example: 30 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getDashboardStats() {
    const stats = await this.enrollmentsService.getStats();
    return {
      message: 'Dashboard statistics retrieved successfully',
      data: stats,
    };
  }
}
