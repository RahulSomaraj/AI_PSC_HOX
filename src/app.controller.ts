import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { EnrollmentsService } from './enrollments/enrollments.service';
import { JwtAuthGuard } from './auth/guards/jwt.auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './common/decorators/roles.decorator';
import { Role } from './common/enums/role.enum';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get application health check',
    description: 'Returns a welcome message indicating the API is running',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns a welcome message',
    schema: {
      type: 'string',
      example: 'Hello World!',
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
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
