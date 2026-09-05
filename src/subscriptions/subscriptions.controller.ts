import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { GetUser } from '../common/decorators/get-user.decorator';
import { HttpExceptionFilter } from '../shared/exception-service';

// Route order is load-bearing. Nest matches in declaration order, so the
// literal segments - stats, me, user - are all declared ahead of ':id'.
// Below it, ':id' would swallow them and answer /subscriptions/me/current
// with "Subscription not found".
@ApiTags('subscriptions')
@UseFilters(new HttpExceptionFilter('subscriptions'))
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @Roles(Role.Admin)
  @ApiTags('admin', 'subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a subscription (Admin only)',
    description:
      'A subscription is one paid term on a plan. A user may hold many over ' +
      'time - renewals and upgrades are new rows, so the run reads as ' +
      'history. The user must exist and not be soft deleted.',
  })
  @ApiBody({
    type: CreateSubscriptionDto,
    examples: {
      annual: {
        summary: 'Annual premium term',
        value: {
          userId: 1,
          planName: 'Premium',
          startDate: '2026-01-01T00:00:00Z',
          expiresAt: '2027-01-01T00:00:00Z',
        },
      },
      monthly: {
        summary: 'Monthly basic term',
        value: {
          userId: 2,
          planName: 'Basic',
          startDate: '2026-01-01T00:00:00Z',
          expiresAt: '2026-02-01T00:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data, or expiresAt is not after startDate',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  create(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @GetUser('id') userId: number,
  ) {
    return this.subscriptionsService.create(createSubscriptionDto, userId);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiTags('admin', 'subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List subscriptions (Admin only)',
    description:
      'Every live subscription, newest term first. Each carries a computed ' +
      'isActive.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions retrieved successfully',
    type: [SubscriptionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  findAll() {
    return this.subscriptionsService.findAll();
  }

  @Get('stats/active-count')
  @Roles(Role.Admin)
  @ApiTags('admin', 'subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Count active subscriptions (Admin only)',
    description:
      'Backs the dashboard tile. Counts subscriptions whose term has not run ' +
      'out and that have not been cancelled, held by users who have not been ' +
      'deleted - the same population Total Students counts. Computed at ' +
      'request time.',
  })
  @ApiResponse({
    status: 200,
    description: 'Count retrieved successfully',
    schema: { example: { activeSubscriptions: 42 } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  countActive() {
    return this.subscriptionsService.countActive();
  }

  // No @Roles: a user reading their own subscription. The id comes off the
  // token rather than the path, so this cannot be pointed at anyone else.
  @Get('me/current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: "Get the caller's current subscription",
    description:
      'Backs the profile card. Returns the active subscription running ' +
      'furthest into the future, or null when the caller has none active - ' +
      'holding no subscription is not an error.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current subscription, or null',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findMyCurrent(@GetUser('id') userId: number) {
    return this.subscriptionsService.findCurrentForUser(userId);
  }

  @Get('user/:userId/current')
  @Roles(Role.Admin)
  @ApiTags('admin', 'subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: "Get a user's current subscription (Admin only)",
    description:
      'The admin-side view of the profile card. Returns null when the user ' +
      'has none active.',
  })
  @ApiParam({ name: 'userId', type: 'number', description: 'User ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Current subscription, or null',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findCurrentForUser(@Param('userId') userId: number) {
    return this.subscriptionsService.findCurrentForUser(+userId);
  }

  @Get('user/:userId')
  @Roles(Role.Admin)
  @ApiTags('admin', 'subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: "List a user's subscriptions (Admin only)",
    description:
      'The whole run for one user, newest term first, expired and cancelled ' +
      'terms included.',
  })
  @ApiParam({ name: 'userId', type: 'number', description: 'User ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions retrieved successfully',
    type: [SubscriptionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findAllForUser(@Param('userId') userId: number) {
    return this.subscriptionsService.findAllForUser(+userId);
  }

  @Get(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get subscription by ID (Admin only)' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Subscription ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription retrieved successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  findOne(@Param('id') id: number) {
    return this.subscriptionsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update subscription by ID (Admin only)',
    description:
      'All fields optional. userId is not among them - a subscription cannot ' +
      'be moved between users; file it against the right one and delete this.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Subscription ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateSubscriptionDto,
    examples: {
      extend: {
        summary: 'Extend the term',
        value: { expiresAt: '2028-01-01T00:00:00Z' },
      },
      cancel: {
        summary: 'Cancel',
        value: { cancelledAt: '2026-06-30T00:00:00Z' },
      },
      uncancel: {
        summary: 'Lift a cancellation made in error',
        value: { cancelledAt: null },
      },
      changePlan: {
        summary: 'Change plan',
        value: { planName: 'Premium Plus' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription updated successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data, or expiresAt is not after startDate',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  update(
    @Param('id') id: number,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
    @GetUser('id') userId: number,
  ) {
    return this.subscriptionsService.update(+id, updateSubscriptionDto, userId);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiTags('admin', 'subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete subscription by ID (Admin only)',
    description:
      'Soft delete. No body is required - the deleter is taken from the ' +
      'token. To end a subscription while keeping it on the record, set ' +
      'cancelledAt through PATCH instead.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'Subscription ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Subscription deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  remove(@Param('id') id: number, @GetUser('id') userId: number) {
    return this.subscriptionsService.remove(+id, userId);
  }
}
