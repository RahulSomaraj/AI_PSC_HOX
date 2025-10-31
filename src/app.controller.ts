import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get application health check' })
  @ApiResponse({ status: 200, description: 'Returns a welcome message' })
  getHello(): string {
    return this.appService.getHello();
  }
}
