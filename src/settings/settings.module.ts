import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

/**
 * Admin settings lookups.
 *
 * No entities: everything it serves today is an enum in code. It imports no
 * other module either - the role labels come from a plain constant in
 * `faculty/`, so there is no dependency on FacultyModule to keep in order.
 */
@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
