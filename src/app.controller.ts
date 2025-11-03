import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { EnrollmentsService } from './enrollments/enrollments.service';
import { JwtAuthGuard } from './auth/guards/jwt.auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './common/decorators/roles.decorator';
import { Role } from './common/enums/role.enum';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getDashboardStats() {
    const stats = await this.enrollmentsService.getStats();
    return {
      message: 'Dashboard statistics retrieved successfully',
      data: stats,
    };
  }
}
