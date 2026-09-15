import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RangeQueryDto, daysIn } from './range-query.dto';

/** Validates a query the way main.ts's ValidationPipe does. */
const errorsFor = async (query: object) =>
  validate(plainToInstance(RangeQueryDto, query), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe('RangeQueryDto', () => {
  it.each(['1d', '7d', '30d', '89d', '90d'])('accepts %s', async (range) => {
    expect(await errorsFor({ range })).toEqual([]);
  });

  it('accepts no range at all', async () => {
    expect(await errorsFor({})).toEqual([]);
  });

  it.each(['0d', '91d', '7', 'd', '7w', '-7d', '07d', '7 d'])(
    'rejects %s',
    async (range) => {
      expect(await errorsFor({ range })).not.toEqual([]);
    },
  );

  it('rejects the old days parameter', async () => {
    const errors = await errorsFor({ days: 7 });
    expect(errors.map((e) => e.property)).toContain('days');
  });

  it('reads the number of days out of a range', () => {
    expect(daysIn('7d')).toBe(7);
    expect(daysIn('90d')).toBe(90);
    expect(daysIn(undefined)).toBe(7);
  });
});
