import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { Subscription } from './entities/subscription.entity';
import { User } from '../users/entities/user.entity';

// User is in forFeature for assertUserExists: a subscription may only be
// filed against a live user, and the FK cannot tell a soft-deleted one from
// a live one. Same reason AspirantProfilesModule holds it.
@Module({
  imports: [TypeOrmModule.forFeature([Subscription, User])],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
