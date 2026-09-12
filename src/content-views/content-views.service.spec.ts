import { ContentViewsService } from './content-views.service';

const STUDENT = { userId: 42, isStaff: false };
const STAFF = { userId: 7, isStaff: true };
const ITEM = { id: 99, subjectId: 3 };

describe('ContentViewsService', () => {
  let views: any;
  let profiles: any;
  let service: ContentViewsService;

  beforeEach(() => {
    views = { insert: jest.fn().mockResolvedValue({}) };
    profiles = { findOne: jest.fn().mockResolvedValue(null) };
    service = new ContentViewsService(views, profiles);
    // The warn path is exercised deliberately below; keep it off the output.
    jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
  });

  it('records an open with the reader and the item subject', async () => {
    profiles.findOne.mockResolvedValue({ id: 5, batchId: 3 });

    await service.record(ITEM, STUDENT);

    expect(views.insert).toHaveBeenCalledWith({
      contentId: 99,
      userId: 42,
      subjectId: 3,
      batchId: 3,
    });
  });

  it('records the reader batch, resolved from their own profile', async () => {
    profiles.findOne.mockResolvedValue({ id: 5, batchId: 3 });

    await service.record(ITEM, STUDENT);

    expect(profiles.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 42 } }),
    );
  });

  it('records a null batch for a reader in none', async () => {
    profiles.findOne.mockResolvedValue(null);

    await service.record(ITEM, STUDENT);

    expect(views.insert).toHaveBeenCalledWith(
      expect.objectContaining({ batchId: null }),
    );
  });

  it('ignores a staff preview, which is not usage', async () => {
    await service.record(ITEM, STAFF);

    expect(views.insert).not.toHaveBeenCalled();
    expect(profiles.findOne).not.toHaveBeenCalled();
  });

  it('counts every open, with no dedup window', async () => {
    await service.record(ITEM, STUDENT);
    await service.record(ITEM, STUDENT);

    expect(views.insert).toHaveBeenCalledTimes(2);
  });

  // The contract ContentService.findOne() relies on to call this in one
  // unguarded line: a student must get their content even when the view
  // table is unreachable.
  describe('never breaks the read', () => {
    it('swallows a failing insert', async () => {
      views.insert.mockRejectedValue(new Error('content_view unreachable'));

      await expect(service.record(ITEM, STUDENT)).resolves.toBeUndefined();
    });

    it('swallows a failing profile lookup', async () => {
      profiles.findOne.mockRejectedValue(new Error('connection lost'));

      await expect(service.record(ITEM, STUDENT)).resolves.toBeUndefined();
      expect(views.insert).not.toHaveBeenCalled();
    });

    it('logs what it swallowed', async () => {
      views.insert.mockRejectedValue(new Error('content_view unreachable'));

      await service.record(ITEM, STUDENT);

      expect(service['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('content_view unreachable'),
      );
    });
  });
});
