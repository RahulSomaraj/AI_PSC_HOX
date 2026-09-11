import { Injectable } from '@nestjs/common';
import {
  FACULTY_ROLE_OPTIONS,
  FacultyRoleOption,
} from '../faculty/faculty-role.enum';

@Injectable()
export class SettingsService {
  /**
   * The faculty roles an admin can assign, labelled.
   *
   * Reads the same constant `GET /faculty/options` serves, so the settings
   * screen and the faculty form can never disagree about what a role is
   * called. No database work: roles are an enum in code, not rows.
   */
  roles(): readonly FacultyRoleOption[] {
    return FACULTY_ROLE_OPTIONS;
  }
}
