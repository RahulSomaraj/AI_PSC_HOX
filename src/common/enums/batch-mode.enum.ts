/**
 * How a batch is delivered. Stored as a varchar (not a Postgres enum) so a
 * new mode can be added without an ALTER TYPE migration - same reasoning as
 * ExamMode.
 */
export enum BatchMode {
  Online = 'online',
  Offline = 'offline',
  Hybrid = 'hybrid',
}
