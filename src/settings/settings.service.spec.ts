import { SettingsService } from './settings.service';
import { FacultyRole } from '../faculty/faculty-role.enum';

describe('SettingsService', () => {
  const service = new SettingsService();

  it('labels every role, in declaration order', () => {
    expect(service.roles()).toEqual([
      { value: FacultyRole.Teacher, label: 'Teacher' },
      { value: FacultyRole.Reviewer, label: 'Reviewer' },
      { value: FacultyRole.ContentCreator, label: 'Content Creator' },
    ]);
  });

  it('covers the enum, so a new role cannot go missing from the dropdown', () => {
    expect(service.roles().map((role) => role.value)).toEqual(
      Object.values(FacultyRole),
    );
  });
});
