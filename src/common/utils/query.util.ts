import { BadRequestException } from '@nestjs/common';

/**
 * Query strings arrive as text. The global ValidationPipe only transforms
 * DTOs, so list endpoints that take plain `@Query()` params convert their own
 * values - and reject junk instead of silently ignoring the filter.
 */
export function toOptionalBoolean(
  value: string | undefined,
  field: string,
): boolean | undefined {
  if (value === undefined || value === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new BadRequestException(`${field} must be "true" or "false"`);
}

export function toOptionalNumber(
  value: string | undefined,
  field: string,
): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestException(`${field} must be a positive integer`);
  }
  return parsed;
}

export function toOptionalEnum<T extends Record<string, string>>(
  value: string | undefined,
  field: string,
  enumType: T,
): T[keyof T] | undefined {
  if (value === undefined || value === '') return undefined;

  const allowed: string[] = Object.values(enumType);
  if (!allowed.includes(value)) {
    throw new BadRequestException(
      `${field} must be one of: ${allowed.join(', ')}`,
    );
  }
  return value as T[keyof T];
}
