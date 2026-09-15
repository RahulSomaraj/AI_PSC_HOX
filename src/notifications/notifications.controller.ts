import {
  Body,
  Controller,
  Get,
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
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FindNotificationsQueryDto } from './dto/find-notifications-query.dto';
import { NotificationDto } from './dto/notification.dto';

// No @Roles at class level, deliberately. RolesGuard reads handler metadata
// first and falls back to the class, so a class-level @Roles(Role.Admin)
// would silently lock students out of `/notifications/mine`. The admin routes
// carry their own.
@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Authentication required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(new HttpExceptionFilter('Notifications'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(Role.Admin)
  @ApiOperation({
    summary: 'Send an announcement to one batch or to every student',
  })
  @ApiResponse({ status: 201, type: NotificationDto })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'No batch with that name' })
  create(
    @Body() dto: CreateNotificationDto,
    @GetUser('id') actorId: number,
  ): Promise<NotificationDto> {
    return this.notificationsService.create(dto, actorId);
  }

  /**
   * The admin Notifications screen: everything sent, newest first.
   *
   * This route used to be the student's own inbox. It became the admin list
   * because that is what the console's Notifications screen calls; the inbox
   * moved to `/notifications/mine`, which nothing was reading yet.
   */
  @Get()
  @Roles(Role.Admin)
  @ApiOperation({
    summary: 'List every announcement sent (Admin only)',
    description:
      'Newest first, as a plain array - the console searches, filters and pages it.',
  })
  @ApiResponse({ status: 200, type: [NotificationDto] })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  findAllSent(): Promise<NotificationDto[]> {
    return this.notificationsService.findAllSent();
  }

  @Get('mine')
  @ApiOperation({
    summary: 'List the announcements addressed to the caller',
    description:
      'Everything sent to everyone, plus everything sent to the batch the caller is in. Newest first.',
  })
  @ApiResponse({ status: 200, type: [NotificationDto] })
  findMine(
    @Query() query: FindNotificationsQueryDto,
    @GetUser('id') userId: number,
  ) {
    return this.notificationsService.findForUser(userId, query);
  }
}
