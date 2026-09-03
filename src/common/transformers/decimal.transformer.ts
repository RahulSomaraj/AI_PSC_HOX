import { ValueTransformer } from 'typeorm';

/**
 * The `pg` driver returns `numeric` columns as strings to avoid float
 * rounding. Marks/weightages are small enough for a JS number, so convert on
 * read and keep the API responses numeric.
 */
export const DecimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value ?? null,
  from: (value?: string | null) =>
    value === null || value === undefined ? null : Number(value),
};
